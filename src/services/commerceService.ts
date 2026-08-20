/* ------------------------------------------------------------------ */
/*  CommerceService — orders, coupons, sliders, settings, analytics.   */
/*  Order totals are ALWAYS recomputed here — never trust the client.  */
/* ------------------------------------------------------------------ */

import type { Address, CartItem, Coupon, Order, OrderStatus, PaymentMethod, Product, Settings, Slide, User } from "../types";
import { dealPrice } from "../types";
import { Repository, db } from "../lib/db";
import { logger } from "../lib/logger";
import { AuthError, requireAuth, requirePerm, PERMS } from "../lib/rbac";
import { isEmail, isPhone, isZip, rateLimiter, stripTags, truncate } from "../lib/security";
import { uid } from "../lib/utils";

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export interface CouponCheck {
  ok: boolean;
  code?: string;
  discount?: number;
  reason?: string;
}

export class CommerceService {
  constructor(
    private orders: Repository<Order>,
    private coupons: Repository<Coupon>,
    private slides: Repository<Slide>,
    private products: Repository<Product>
  ) {}

  /* ----------------------------- settings ---------------------------- */

  settings(): Settings {
    return db.get().settings;
  }

  saveSettings(actor: User, patch: Partial<Settings>) {
    requirePerm(actor, PERMS.SETTINGS);
    db.update((d) => {
      d.settings = { ...d.settings, ...patch };
    });
    logger.info("SETTINGS_UPDATED", actor.email, Object.keys(patch).join(", "));
  }

  /* ------------------------------ slides ----------------------------- */

  activeSlides(): Slide[] {
    return this.slides.where((s) => s.active).sort((a, b) => a.order - b.order);
  }

  allSlides(): Slide[] {
    return this.slides.all().sort((a, b) => a.order - b.order);
  }

  saveSlide(actor: User, input: Omit<Slide, "id" | "order">, id?: string): Slide {
    requirePerm(actor, PERMS.SLIDE_W);
    const clean = {
      ...input,
      badge: truncate(stripTags(input.badge), 30),
      title: truncate(stripTags(input.title), 60),
      subtitle: truncate(stripTags(input.subtitle), 120),
      cta: truncate(stripTags(input.cta), 30),
    };
    if (!clean.title) throw new AuthError("Slide title is required", 422);
    if (id) {
      this.slides.patch(id, clean);
      logger.info("SLIDE_UPDATED", actor.email, clean.title);
      return this.slides.find(id)!;
    }
    const maxOrder = this.slides.all().reduce((m, s) => Math.max(m, s.order), 0);
    const slide = this.slides.insert({ ...clean, id: uid("s"), order: maxOrder + 1 });
    logger.info("SLIDE_CREATED", actor.email, clean.title);
    return slide;
  }

  deleteSlide(actor: User, id: string) {
    requirePerm(actor, PERMS.SLIDE_W);
    const s = this.slides.find(id);
    this.slides.remove(id);
    logger.warn("SLIDE_DELETED", actor.email, s?.title ?? id);
  }

  moveSlide(actor: User, id: string, dir: -1 | 1) {
    requirePerm(actor, PERMS.SLIDE_W);
    const sorted = this.allSlides();
    const idx = sorted.findIndex((s) => s.id === id);
    const swap = sorted[idx + dir];
    if (!swap) return;
    const a = sorted[idx];
    this.slides.patch(a.id, { order: swap.order });
    this.slides.patch(swap.id, { order: a.order });
    logger.debug("SLIDE_REORDERED", actor.email, a.title);
  }

  /* ----------------------------- coupons ----------------------------- */

  allCoupons(): Coupon[] {
    return [...this.coupons.all()].sort((a, b) => a.code.localeCompare(b.code));
  }

  saveCoupon(actor: User, input: Omit<Coupon, "id" | "used">, id?: string): Coupon {
    requirePerm(actor, PERMS.COUPON_W);
    const code = stripTags(input.code).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
    if (code.length < 3) throw new AuthError("Coupon code must be at least 3 characters", 422);
    if (!(input.value > 0)) throw new AuthError("Coupon value must be positive", 422);
    if (input.kind === "percent" && input.value > 90) throw new AuthError("Percent coupons are capped at 90%", 422);
    const dupe = this.coupons.where((c) => c.code === code && c.id !== id)[0];
    if (dupe) throw new AuthError("That coupon code already exists", 409);
    if (id) {
      this.coupons.patch(id, { ...input, code });
      logger.info("COUPON_UPDATED", actor.email, code);
      return this.coupons.find(id)!;
    }
    const coupon = this.coupons.insert({ ...input, code, id: uid("cp"), used: 0 });
    logger.info("COUPON_CREATED", actor.email, code);
    return coupon;
  }

  toggleCoupon(actor: User, id: string) {
    requirePerm(actor, PERMS.COUPON_W);
    const c = this.coupons.find(id);
    if (!c) return;
    this.coupons.patch(id, { active: !c.active });
    logger.info(c.active ? "COUPON_DISABLED" : "COUPON_ENABLED", actor.email, c.code);
  }

  deleteCoupon(actor: User, id: string) {
    requirePerm(actor, PERMS.COUPON_W);
    const c = this.coupons.find(id);
    this.coupons.remove(id);
    logger.warn("COUPON_DELETED", actor.email, c?.code ?? id);
  }

  validateCoupon(code: string, subtotal: number): CouponCheck {
    const rl = rateLimiter.hit("coupon:global", 10, 60 * 1000);
    if (!rl.ok) return { ok: false, reason: `Too many attempts — wait ${rl.retryIn}s` };
    const clean = code.trim().toUpperCase();
    if (!clean) return { ok: false, reason: "Enter a coupon code" };
    const coupon = this.coupons.where((c) => c.code === clean)[0];
    if (!coupon) return { ok: false, reason: "Invalid coupon code" };
    if (!coupon.active) return { ok: false, reason: "This coupon is no longer active" };
    if (coupon.expiresAt && coupon.expiresAt < Date.now()) return { ok: false, reason: "This coupon has expired" };
    if (subtotal < coupon.minOrder) return { ok: false, reason: `Requires a minimum order of $${coupon.minOrder}` };
    const discount = coupon.kind === "percent" ? Math.round((subtotal * coupon.value) / 100) : Math.min(coupon.value, subtotal);
    return { ok: true, code: coupon.code, discount };
  }

  /* ------------------------------ orders ----------------------------- */

  placeOrder(user: User, items: CartItem[], address: Address, payment: PaymentMethod, couponCode: string | null): Order {
    requireAuth(user);
    if (!items.length) throw new AuthError("Your cart is empty", 422);

    // input hardening
    const cleanAddress: Address = {
      name: truncate(stripTags(address.name), 60),
      phone: truncate(stripTags(address.phone), 24),
      line: truncate(stripTags(address.line), 120),
      city: truncate(stripTags(address.city), 60),
      zip: truncate(stripTags(address.zip), 12),
    };
    if (cleanAddress.name.length < 2) throw new AuthError("Recipient name is required", 422);
    if (!isPhone(cleanAddress.phone)) throw new AuthError("Enter a valid phone number", 422);
    if (cleanAddress.line.length < 4) throw new AuthError("Street address is required", 422);
    if (cleanAddress.city.length < 2) throw new AuthError("City is required", 422);
    if (!isZip(cleanAddress.zip)) throw new AuthError("Enter a valid postal code", 422);

    // recompute prices from the catalog — client totals are never trusted
    const orderItems = items.map((ci) => {
      const p = this.products.find(ci.productId);
      if (!p || p.status !== "active") throw new AuthError("An item in your cart is no longer available", 409);
      if (p.stock < ci.qty) throw new AuthError(`Only ${p.stock} unit(s) of ${p.name} left in stock`, 409);
      return {
        productId: p.id,
        name: p.name,
        brand: p.brand,
        price: dealPrice(p),
        qty: ci.qty,
        body: p.visual.body,
        screenA: p.visual.screenA,
        screenB: p.visual.screenB,
      };
    });

    const subtotal = orderItems.reduce((s, i) => s + i.price * i.qty, 0);
    let discount = 0;
    let appliedCode: string | null = null;
    if (couponCode) {
      const check = this.validateCoupon(couponCode, subtotal);
      if (check.ok) {
        discount = check.discount ?? 0;
        appliedCode = check.code!;
      }
    }
    const settings = this.settings();
    const shipping = subtotal - discount >= settings.freeShipOver ? 0 : settings.shippingFee;
    const total = subtotal - discount + shipping;

    // commit stock + coupon usage + order in one unit of work per mutation
    orderItems.forEach((i) => {
      const p = this.products.find(i.productId)!;
      this.products.patch(p.id, { stock: p.stock - i.qty, sold: p.sold + i.qty });
    });
    if (appliedCode) {
      const c = this.coupons.where((x) => x.code === appliedCode)[0];
      if (c) this.coupons.patch(c.id, { used: c.used + 1 });
    }

    const order = this.orders.insert({
      id: `VLT-${Math.floor(10000 + Math.random() * 89999)}`,
      userId: user.id,
      email: user.email,
      items: orderItems,
      subtotal,
      discount,
      couponCode: appliedCode,
      shipping,
      total,
      address: cleanAddress,
      payment,
      status: "pending",
      timeline: [{ status: "pending", at: Date.now() }],
      createdAt: Date.now(),
    });
    logger.info("ORDER_PLACED", user.email, `${order.id} · $${total}`);
    return order;
  }

  ordersFor(user: User): Order[] {
    if (user.role === "customer") return this.orders.where((o) => o.userId === user.id).sort((a, b) => b.createdAt - a.createdAt);
    requirePerm(user, PERMS.ORDER_R);
    return this.orders.all().sort((a, b) => b.createdAt - a.createdAt);
  }

  orderById(user: User, id: string): Order | null {
    const order = this.orders.find(id);
    if (!order) return null;
    if (user.role === "customer" && order.userId !== user.id) {
      logger.security("ORDER_ACCESS_DENIED", user.email, id);
      return null;
    }
    return order;
  }

  cancelByCustomer(user: User, id: string) {
    requireAuth(user);
    const order = this.orders.find(id);
    if (!order || order.userId !== user.id) throw new AuthError("Order not found", 404);
    if (order.status !== "pending") throw new AuthError("Only pending orders can be cancelled", 409);
    this.restock(order);
    this.orders.patch(id, { status: "cancelled", timeline: [...order.timeline, { status: "cancelled", at: Date.now() }] });
    logger.info("ORDER_CANCELLED", user.email, id);
  }

  setStatus(actor: User, id: string, status: OrderStatus) {
    requirePerm(actor, PERMS.ORDER_W);
    const order = this.orders.find(id);
    if (!order) throw new AuthError("Order not found", 404);
    const allowed = NEXT_STATUS[order.status] ?? [];
    if (!allowed.includes(status)) throw new AuthError(`Cannot move ${order.status} → ${status}`, 409);
    if (status === "cancelled") this.restock(order);
    this.orders.patch(id, { status, timeline: [...order.timeline, { status, at: Date.now() }] });
    logger.info("ORDER_STATUS_CHANGED", actor.email, `${id}: ${order.status} → ${status}`);
  }

  private restock(order: Order) {
    order.items.forEach((i) => {
      const p = this.products.find(i.productId);
      if (p) this.products.patch(p.id, { stock: p.stock + i.qty, sold: Math.max(0, p.sold - i.qty) });
    });
  }

  /* ---------------------------- newsletter --------------------------- */

  subscribeNewsletter(email: string) {
    const em = email.trim().toLowerCase();
    if (!isEmail(em)) throw new AuthError("Enter a valid email address", 422);
    const rl = rateLimiter.hit(`news:${em}`, 3, 60 * 60 * 1000);
    if (!rl.ok) throw new AuthError(`Already subscribed recently — wait ${rl.retryIn}s`, 429);
    if (db.get().newsletter.includes(em)) throw new AuthError("You're already on the list ⚡", 409);
    db.update((d) => d.newsletter.push(em));
    logger.info("NEWSLETTER_SUBSCRIBED", em);
  }

  /* ----------------------------- analytics --------------------------- */

  stats() {
    const orders = this.orders.all();
    const live = orders.filter((o) => o.status !== "cancelled");
    const revenue = live.reduce((s, o) => s + o.total, 0);
    const customers = new Set(orders.map((o) => o.userId)).size;
    const products = this.products.all();
    const settings = this.settings();
    const lowStock = products.filter((p) => p.stock <= settings.lowStockThreshold && p.status === "active");

    const days = 14;
    const revenueSeries = Array.from({ length: days }, (_, i) => {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - (days - 1 - i));
      const next = day.getTime() + 86400000;
      const value = live.filter((o) => o.createdAt >= day.getTime() && o.createdAt < next).reduce((s, o) => s + o.total, 0);
      return { label: day.toLocaleDateString("en-US", { day: "numeric" }), value };
    });

    const unitsByProduct = new Map<string, { units: number; revenue: number; name: string; body: string; screenA: string; screenB: string }>();
    live.forEach((o) =>
      o.items.forEach((i) => {
        const cur = unitsByProduct.get(i.productId) ?? { units: 0, revenue: 0, name: i.name, body: i.body, screenA: i.screenA, screenB: i.screenB };
        cur.units += i.qty;
        cur.revenue += i.price * i.qty;
        unitsByProduct.set(i.productId, cur);
      })
    );
    const topProducts = [...unitsByProduct.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      revenue,
      ordersCount: orders.length,
      customers,
      avgOrder: live.length ? Math.round(revenue / live.length) : 0,
      lowStock,
      revenueSeries,
      topProducts,
      recent: orders.sort((a, b) => b.createdAt - a.createdAt).slice(0, 6),
    };
  }
}

export const commerceService = new CommerceService(
  new Repository<Order>("orders"),
  new Repository<Coupon>("coupons"),
  new Repository<Slide>("slides"),
  new Repository<Product>("products")
);
