/* ------------------------------------------------------------------ */
/*  CatalogService — products, categories, reviews.                    */
/*  Writes require products.write / categories.write permissions.      */
/* ------------------------------------------------------------------ */

import type { Category, Product, Review, Specs, User, Visual } from "../types";
import { Repository } from "../lib/db";
import { logger } from "../lib/logger";
import { AuthError, requireAuth, requirePerm, PERMS } from "../lib/rbac";
import { rateLimiter, stripTags, truncate } from "../lib/security";
import { uid } from "../lib/utils";

export interface ProductInput {
  name: string;
  brand: string;
  categoryId: string;
  price: number;
  compareAt: number | null;
  stock: number;
  featured: boolean;
  dealPercent: number | null;
  dealDays: number;
  visual: Visual;
  gallery: string[];
  specs: Specs;
  description: string;
  highlights: string[];
  status: Product["status"];
}

export class CatalogService {
  constructor(
    private products: Repository<Product>,
    private cats: Repository<Category>,
    private reviews: Repository<Review>
  ) {}

  /* ------------------------------ reads ------------------------------ */

  storeProducts(): Product[] {
    return this.products.where((p) => p.status === "active");
  }

  adminProducts(): Product[] {
    return this.products.all();
  }

  byId(id: string): Product | null {
    return this.products.find(id);
  }

  brands(): string[] {
    return [...new Set(this.products.all().map((p) => p.brand))].sort();
  }

  categories(): Category[] {
    return [...this.cats.all()].sort((a, b) => a.name.localeCompare(b.name));
  }

  categoryById(id: string): Category | null {
    return this.cats.find(id);
  }

  reviewsFor(productId: string): Review[] {
    return this.reviews.where((r) => r.productId === productId).sort((a, b) => b.createdAt - a.createdAt);
  }

  ratingFor(productId: string): { avg: number; count: number; dist: number[] } {
    const list = this.reviewsFor(productId);
    const dist = [0, 0, 0, 0, 0];
    list.forEach((r) => {
      dist[r.rating - 1] += 1;
    });
    const avg = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0;
    return { avg, count: list.length, dist };
  }

  related(product: Product, n = 4): Product[] {
    return this.storeProducts()
      .filter((p) => p.id !== product.id && (p.categoryId === product.categoryId || p.brand === product.brand))
      .slice(0, n);
  }

  /* ----------------------------- reviews ----------------------------- */

  addReview(user: User, productId: string, rating: number, comment: string): Review {
    requireAuth(user);
    if (!this.products.find(productId)) throw new AuthError("Product not found", 404);
    if (rating < 1 || rating > 5) throw new AuthError("Rating must be 1–5", 422);
    const clean = truncate(stripTags(comment), 600);
    if (clean.length < 4) throw new AuthError("Review is a little too short", 422);

    const rl = rateLimiter.hit(`review:${user.id}`, 3, 10 * 60 * 1000);
    if (!rl.ok) {
      logger.security("REVIEW_RATE_LIMITED", user.email, `retry in ${rl.retryIn}s`);
      throw new AuthError(`Slow down — try again in ${rl.retryIn}s`, 429);
    }

    const existing = this.reviews.where((r) => r.productId === productId && r.userId === user.id)[0];
    if (existing) {
      this.reviews.patch(existing.id, { rating, comment: clean, createdAt: Date.now() });
      logger.info("REVIEW_UPDATED", user.email, productId);
      return this.reviews.find(existing.id)!;
    }
    const review = this.reviews.insert({
      id: uid("r"),
      productId,
      userId: user.id,
      name: user.name,
      rating,
      comment: clean,
      createdAt: Date.now(),
    });
    logger.info("REVIEW_ADDED", user.email, `${productId} ★${rating}`);
    return review;
  }

  /* ------------------------- product writes -------------------------- */

  private sanitizeInput(input: ProductInput): ProductInput {
    return {
      ...input,
      name: truncate(stripTags(input.name), 80),
      brand: truncate(stripTags(input.brand), 30),
      description: truncate(stripTags(input.description), 900),
      highlights: input.highlights.map((h) => truncate(stripTags(h), 90)).filter(Boolean).slice(0, 6),
    };
  }

  saveProduct(actor: User, input: ProductInput, id?: string): Product {
    requirePerm(actor, PERMS.PROD_W);
    const clean = this.sanitizeInput(input);
    if (!clean.name) throw new AuthError("Product name is required", 422);
    if (!clean.brand) throw new AuthError("Brand is required", 422);
    if (!(clean.price > 0)) throw new AuthError("Price must be greater than 0", 422);
    if (clean.compareAt !== null && clean.compareAt <= clean.price) throw new AuthError("Compare-at price must exceed the price", 422);
    if (clean.stock < 0) throw new AuthError("Stock cannot be negative", 422);

    const deal =
      clean.dealPercent && clean.dealPercent > 0
        ? { percent: Math.min(90, clean.dealPercent), endsAt: Date.now() + Math.max(1, clean.dealDays) * 86400000 }
        : null;

    if (id) {
      const existing = this.products.find(id);
      if (!existing) throw new AuthError("Product not found", 404);
      this.products.patch(id, {
        name: clean.name,
        brand: clean.brand,
        categoryId: clean.categoryId,
        price: clean.price,
        compareAt: clean.compareAt,
        stock: clean.stock,
        featured: clean.featured,
        deal,
        visual: clean.visual,
        gallery: clean.gallery.length ? clean.gallery : [clean.visual.body],
        specs: clean.specs,
        description: clean.description,
        highlights: clean.highlights,
        status: clean.status,
      });
      logger.info("PRODUCT_UPDATED", actor.email, clean.name);
      return this.products.find(id)!;
    }

    const product = this.products.insert({
      id: uid("p"),
      name: clean.name,
      brand: clean.brand,
      categoryId: clean.categoryId,
      price: clean.price,
      compareAt: clean.compareAt,
      stock: clean.stock,
      sold: 0,
      featured: clean.featured,
      deal,
      visual: clean.visual,
      gallery: clean.gallery.length ? clean.gallery : [clean.visual.body],
      specs: clean.specs,
      description: clean.description,
      highlights: clean.highlights,
      status: clean.status,
      createdAt: Date.now(),
    });
    logger.info("PRODUCT_CREATED", actor.email, clean.name);
    return product;
  }

  deleteProduct(actor: User, id: string) {
    requirePerm(actor, PERMS.PROD_W);
    const p = this.products.find(id);
    if (!p) throw new AuthError("Product not found", 404);
    this.reviews.where((r) => r.productId === id).forEach((r) => this.reviews.remove(r.id));
    this.products.remove(id);
    logger.warn("PRODUCT_DELETED", actor.email, p.name);
  }

  /* ------------------------ category writes -------------------------- */

  saveCategory(actor: User, data: { name: string; icon: string; blurb: string }, id?: string): Category {
    requirePerm(actor, PERMS.CAT_W);
    const name = truncate(stripTags(data.name), 30);
    if (!name) throw new AuthError("Category name is required", 422);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const blurb = truncate(stripTags(data.blurb), 60);
    if (id) {
      this.cats.patch(id, { name, slug, icon: data.icon, blurb });
      logger.info("CATEGORY_UPDATED", actor.email, name);
      return this.cats.find(id)!;
    }
    const cat = this.cats.insert({ id: uid("c"), name, slug, icon: data.icon, blurb });
    logger.info("CATEGORY_CREATED", actor.email, name);
    return cat;
  }

  deleteCategory(actor: User, id: string) {
    requirePerm(actor, PERMS.CAT_W);
    const inUse = this.products.count((p) => p.categoryId === id);
    if (inUse > 0) throw new AuthError(`Category has ${inUse} product(s) — reassign them first`, 409);
    const cat = this.cats.find(id);
    this.cats.remove(id);
    logger.warn("CATEGORY_DELETED", actor.email, cat?.name ?? id);
  }
}

export const catalogService = new CatalogService(
  new Repository<Product>("products"),
  new Repository<Category>("categories"),
  new Repository<Review>("reviews")
);
