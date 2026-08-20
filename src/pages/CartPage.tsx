import { useMemo, useState } from "react";
import type { Order, PaymentMethod } from "../types";
import { dealPrice } from "../types";
import { useApp } from "../context/AppContext";
import { catalogService } from "../services/catalogService";
import { commerceService } from "../services/commerceService";
import { cx, money, navigate } from "../lib/utils";
import { expiryValid, luhnValid } from "../lib/security";
import { Icon } from "../components/icons";
import { Badge, Button, EmptyState, Input, Reveal, Stepper } from "../components/ui";
import { PhoneTile } from "../components/PhoneArt";

/* ------------------------------- cart -------------------------------- */

export function CartPage() {
  const { cart, setCartQty, removeFromCart, dbVersion, user } = useApp();
  void dbVersion;
  const settings = commerceService.settings();
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const lines = useMemo(
    () =>
      cart
        .map((c) => ({ item: c, product: catalogService.byId(c.productId) }))
        .filter((l) => l.product && l.product.status === "active"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cart, dbVersion]
  ) as { item: { productId: string; qty: number }; product: NonNullable<ReturnType<typeof catalogService.byId>> }[];

  const subtotal = lines.reduce((s, l) => s + dealPrice(l.product) * l.item.qty, 0);
  const discount = applied ? Math.min(applied.discount, subtotal) : 0;
  const shipping = lines.length === 0 ? 0 : subtotal - discount >= settings.freeShipOver ? 0 : settings.shippingFee;
  const total = subtotal - discount + shipping;

  const applyCoupon = () => {
    const check = commerceService.validateCoupon(coupon, subtotal);
    if (check.ok) {
      setApplied({ code: check.code!, discount: check.discount! });
      setCouponMsg({ ok: true, text: `${check.code} applied — you save ${money(check.discount!)}` });
    } else {
      setApplied(null);
      setCouponMsg({ ok: false, text: check.reason ?? "Invalid coupon" });
    }
  };

  if (lines.length === 0) {
    return (
      <EmptyState
        icon="cart"
        title="Nothing in the cart yet"
        sub="Your next favourite phone is one tap away."
        action={<Button size="lg" iconRight="arrowR" onClick={() => navigate("/shop")}>Browse the lineup</Button>}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-d text-2xl sm:text-3xl font-bold mb-8">Your cart</h1>
      <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
        <div className="space-y-4">
          {lines.map(({ item, product }) => (
            <Reveal key={item.productId}>
              <div className="flex gap-4 bg-white border border-linel p-4">
                <button className="w-24 sm:w-28 shrink-0 cursor-pointer" onClick={() => navigate(`/product/${product.id}`)}>
                  <PhoneTile visual={product.visual} height="h-28" tilt={-4} />
                </button>
                <div className="grow min-w-0">
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-widest text-ink/40">{product.brand}</p>
                      <p className="text-[15px] font-extrabold leading-snug">{product.name}</p>
                    </div>
                    <button onClick={() => removeFromCart(item.productId)} className="p-1.5 text-ink/35 hover:text-bad transition-colors self-start" aria-label="Remove item">
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                  <p className="text-xs font-bold text-ink/45 mt-0.5">{product.specs.ram} · {product.specs.storage}</p>
                  <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                    <Stepper small value={item.qty} max={product.stock} onChange={(v) => setCartQty(item.productId, v)} />
                    <div className="text-right">
                      {product.deal && <p className="text-[11px] font-bold text-ink/35 line-through tabular-nums">{money(product.price * item.qty)}</p>}
                      <p className="font-d text-[17px] font-bold tabular-nums">{money(dealPrice(product) * item.qty)}</p>
                    </div>
                  </div>
                  {item.qty >= product.stock && (
                    <p className="mt-2 text-[11px] font-extrabold text-warn">Max stock reached — {product.stock} available</p>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={100}>
          <div className="bg-ink text-paper p-6 notch grid-dark relative overflow-hidden lg:sticky lg:top-32">
            <div className="absolute -top-16 -right-16 w-56 h-56 glow-volt" />
            <p className="font-d text-lg font-bold mb-5 relative">Order summary</p>

            <div className="relative">
              <div className="flex items-center gap-2 bg-ink2 border border-line notch-sm">
                <Icon name="tag" size={15} className="ml-3 text-paper/40" />
                <input
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                  placeholder="Coupon code"
                  className="bg-transparent px-2 py-2.5 text-sm font-bold w-full outline-none placeholder:text-paper/30 uppercase"
                />
                <button onClick={applyCoupon} className="px-4 py-2.5 text-sm font-extrabold text-volt hover:text-voltl transition-colors">
                  Apply
                </button>
              </div>
              {couponMsg && (
                <p className={cx("mt-2 text-xs font-extrabold flex items-center gap-1.5", couponMsg.ok ? "text-volt" : "text-bad")}>
                  <Icon name={couponMsg.ok ? "check" : "alert"} size={12} /> {couponMsg.text}
                </p>
              )}

              <div className="mt-5 space-y-2.5 text-sm font-bold">
                <Row k="Subtotal" v={money(subtotal)} />
                {discount > 0 && <Row k={`Coupon ${applied?.code}`} v={`−${money(discount)}`} accent="text-volt" />}
                <Row k="Shipping" v={shipping === 0 ? "FREE" : money(shipping)} accent={shipping === 0 ? "text-volt" : undefined} />
                <div className="border-t border-line pt-3 flex justify-between items-baseline">
                  <span className="text-paper/60">Total</span>
                  <span className="font-d text-2xl font-bold text-volt tabular-nums">{money(total)}</span>
                </div>
              </div>

              <Button full size="lg" className="mt-6" iconRight="arrowR" onClick={() => navigate(user ? "/checkout" : "/auth?next=/checkout")}>
                {user ? "Proceed to checkout" : "Sign in to checkout"}
              </Button>
              <p className="mt-3 text-[11px] font-bold text-paper/40 flex items-center gap-1.5 justify-center">
                <Icon name="lock" size={12} /> Prices re-validated server-side at checkout
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

function Row({ k, v, accent }: { k: string; v: string; accent?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-paper/55">{k}</span>
      <span className={cx("tabular-nums", accent)}>{v}</span>
    </div>
  );
}

/* ------------------------------ checkout ----------------------------- */

export function CheckoutPage() {
  const { user, cart, clearCart, dbVersion, toast } = useApp();
  const settings = commerceService.settings();
  const [form, setForm] = useState({ name: user?.name ?? "", phone: "", line: "", city: "", zip: "" });
  const [payment, setPayment] = useState<PaymentMethod>("card");
  const [card, setCard] = useState({ number: "", expiry: "", cvc: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState<Order | null>(null);

  const lines = useMemo(
    () =>
      cart
        .map((c) => ({ item: c, product: catalogService.byId(c.productId) }))
        .filter((l) => l.product),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cart, dbVersion]
  ) as { item: { productId: string; qty: number }; product: NonNullable<ReturnType<typeof catalogService.byId>> }[];

  const subtotal = lines.reduce((s, l) => s + dealPrice(l.product) * l.item.qty, 0);
  const shipping = subtotal >= settings.freeShipOver ? 0 : settings.shippingFee;
  const total = subtotal + shipping;

  if (!user) {
    return (
      <EmptyState
        icon="lock"
        title="Sign in to check out"
        sub="Your cart is saved — sign in and you'll land right back here."
        action={<Button size="lg" onClick={() => navigate("/auth?next=/checkout")}>Sign in / register</Button>}
      />
    );
  }

  if (placed) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 mx-auto grid place-items-center bg-ok/12 text-ok notch pop-in mb-6">
          <Icon name="check" size={38} strokeWidth={2.4} />
        </div>
        <p className="font-d text-2xl sm:text-3xl font-bold">Order confirmed ⚡</p>
        <p className="mt-3 text-[15px] font-semibold text-ink/55">
          <span className="font-extrabold text-ink">{placed.id}</span> · {money(placed.total)} · {placed.payment === "cod" ? "cash on delivery" : "card payment"}
        </p>
        <div className="mt-8 bg-white border border-linel p-6 text-left">
          {placed.items.map((i) => (
            <div key={i.productId} className="flex justify-between py-2 text-sm font-bold border-b border-linel last:border-0">
              <span>{i.qty}× {i.name}</span>
              <span className="tabular-nums">{money(i.price * i.qty)}</span>
            </div>
          ))}
          <div className="flex justify-between pt-3 text-sm font-extrabold">
            <span className="text-ink/50">Delivering to</span>
            <span>{placed.address.line}, {placed.address.city}</span>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="dark" icon="box" onClick={() => navigate("/account?t=orders")}>Track order</Button>
          <Button variant="outline" onClick={() => navigate("/shop")}>Keep shopping</Button>
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <EmptyState icon="cart" title="Cart is empty" sub="Add a device before checking out." action={<Button onClick={() => navigate("/shop")}>Back to shop</Button>} />
    );
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = "Recipient name required";
    if (!/^[+\d][\d\s\-()]{6,18}$/.test(form.phone.trim())) e.phone = "Valid phone required";
    if (form.line.trim().length < 4) e.line = "Street address required";
    if (form.city.trim().length < 2) e.city = "City required";
    if (!/^[0-9]{4,10}$/.test(form.zip.trim())) e.zip = "Valid postal code required";
    if (payment === "card") {
      if (!luhnValid(card.number)) e.cardNumber = "Card number failed validation";
      if (!expiryValid(card.expiry)) e.cardExpiry = "Use MM/YY, in the future";
      if (!/^\d{3,4}$/.test(card.cvc)) e.cardCvc = "3–4 digits";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const placeOrder = async () => {
    if (!validate()) {
      toast("Fix the highlighted fields", "error");
      return;
    }
    setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 900));
      const order = commerceService.placeOrder(user, cart, form, payment, null);
      clearCart();
      setPlaced(order);
      toast(`Order ${order.id} placed`);
      window.scrollTo({ top: 0 });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Checkout failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-d text-2xl sm:text-3xl font-bold mb-8">Secure checkout</h1>
      <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
        <div className="space-y-6">
          <Reveal>
            <section className="bg-white border border-linel p-6">
              <SectionTitle n="01" title="Contact" />
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Full name" value={form.name} error={errors.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jordan Volt" />
                <Input label="Phone" value={form.phone} error={errors.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 010 2030" />
              </div>
            </section>
          </Reveal>
          <Reveal delay={60}>
            <section className="bg-white border border-linel p-6">
              <SectionTitle n="02" title="Shipping address" />
              <div className="grid sm:grid-cols-[1fr_160px] gap-4">
                <Input label="Street address" value={form.line} error={errors.line} onChange={(e) => setForm({ ...form, line: e.target.value })} placeholder="42 Circuit Avenue, Apt 7" />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="City" value={form.city} error={errors.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Austin" />
                  <Input label="ZIP" value={form.zip} error={errors.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} placeholder="73301" />
                </div>
              </div>
            </section>
          </Reveal>
          <Reveal delay={120}>
            <section className="bg-white border border-linel p-6">
              <SectionTitle n="03" title="Payment" />
              <div className="grid sm:grid-cols-2 gap-3 mb-5">
                <PayOption active={payment === "card"} icon="card" title="Card" sub="Validated with Luhn check" onClick={() => setPayment("card")} />
                <PayOption active={payment === "cod"} icon="cash" title="Cash on delivery" sub="Pay when it arrives" onClick={() => setPayment("cod")} />
              </div>
              {payment === "card" && (
                <div className="fade-up">
                  <Input
                    label="Card number"
                    value={card.number}
                    error={errors.cardNumber}
                    onChange={(e) => setCard({ ...card, number: e.target.value.replace(/[^\d ]/g, "").slice(0, 19) })}
                    placeholder="4242 4242 4242 4242"
                    hint="Demo checkout — try any Luhn-valid number, e.g. 4242 4242 4242 4242"
                  />
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <Input label="Expiry" value={card.expiry} error={errors.cardExpiry} onChange={(e) => setCard({ ...card, expiry: e.target.value.replace(/[^\d/]/g, "").slice(0, 5) })} placeholder="12/27" />
                    <Input label="CVC" type="password" value={card.cvc} error={errors.cardCvc} onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="•••" />
                  </div>
                </div>
              )}
              {payment === "cod" && (
                <p className="fade-up text-[13px] font-bold text-ink/55 bg-mist border border-linel px-4 py-3 flex gap-2 items-center">
                  <Icon name="info" size={15} className="text-voltd shrink-0" /> Have {money(total)} ready — our courier carries limited change.
                </p>
              )}
            </section>
          </Reveal>
        </div>

        <Reveal delay={150}>
          <div className="bg-ink text-paper p-6 notch grid-dark relative overflow-hidden lg:sticky lg:top-32">
            <div className="absolute -top-16 -right-16 w-56 h-56 glow-volt" />
            <p className="font-d text-lg font-bold mb-4 relative">Your order</p>
            <div className="space-y-3 relative">
              {lines.map(({ item, product }) => (
                <div key={item.productId} className="flex items-center gap-3">
                  <span
                    className="w-10 h-14 shrink-0 notch-sm border border-paper/15"
                    style={{ background: `linear-gradient(160deg, ${product.visual.body}, ${product.visual.screenB})` }}
                  />
                  <div className="grow min-w-0">
                    <p className="text-[13px] font-extrabold truncate">{product.name}</p>
                    <p className="text-[11px] font-bold text-paper/40">Qty {item.qty}</p>
                  </div>
                  <span className="text-sm font-bold tabular-nums">{money(dealPrice(product) * item.qty)}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-line space-y-2 text-sm font-bold relative">
              <Row k="Subtotal" v={money(subtotal)} />
              <Row k="Shipping" v={shipping === 0 ? "FREE" : money(shipping)} accent={shipping === 0 ? "text-volt" : undefined} />
              <div className="flex justify-between items-baseline pt-2">
                <span className="text-paper/60">Total</span>
                <span className="font-d text-2xl font-bold text-volt tabular-nums">{money(total)}</span>
              </div>
            </div>
            <Button full size="lg" className="mt-6 relative" loading={busy} icon="lock" onClick={placeOrder}>
              {busy ? "Encrypting & placing…" : `Place order · ${money(total)}`}
            </Button>
            <p className="mt-3 text-[11px] font-bold text-paper/40 text-center relative flex items-center justify-center gap-1.5">
              <Icon name="shield" size={12} /> Totals recomputed in the service layer — never trusted from the client
            </p>
          </div>
        </Reveal>
      </div>
      {Object.keys(errors).length > 0 && <Badge tone="bad" className="mt-4">Fix errors above</Badge>}
    </div>
  );
}

function SectionTitle({ n, title }: { n: string; title: string }) {
  return (
    <p className="flex items-center gap-2.5 mb-5">
      <span className="font-d text-xs font-bold text-volt">{n}</span>
      <span className="font-d text-[15px] font-bold">{title}</span>
      <span className="h-px grow bg-linel" />
    </p>
  );
}

function PayOption({ active, icon, title, sub, onClick }: { active: boolean; icon: string; title: string; sub: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "flex items-center gap-3 border-[1.5px] p-4 text-left transition-all",
        active ? "border-volt bg-volt/8" : "border-linel hover:border-ink/30"
      )}
    >
      <span className={cx("w-10 h-10 grid place-items-center notch-sm", active ? "bg-volt text-white" : "bg-mist text-ink/50")}>
        <Icon name={icon} size={18} />
      </span>
      <span>
        <span className="block text-sm font-extrabold">{title}</span>
        <span className="block text-[11px] font-bold text-ink/45">{sub}</span>
      </span>
      <span className={cx("ml-auto w-4 h-4 rounded-full border-2 grid place-items-center", active ? "border-volt" : "border-ink/20")}>
        {active && <span className="w-1.5 h-1.5 rounded-full bg-volt" />}
      </span>
    </button>
  );
}
