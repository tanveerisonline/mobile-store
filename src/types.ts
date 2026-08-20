/* ------------------------------------------------------------------ */
/*  VOLT Mobile — domain model (mirrors the Prisma schema 1:1)         */
/* ------------------------------------------------------------------ */

export type Role = "admin" | "editor" | "viewer" | "customer";
export type UserStatus = "active" | "suspended";
export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
export type ProductStatus = "active" | "draft";
export type PaymentMethod = "cod" | "card";
export type LogLevel = "DEBUG" | "INFO" | "WARN" | "SECURITY";

export interface User {
  id: string;
  name: string;
  email: string;
  passHash: string;
  salt: string;
  role: Role;
  status: UserStatus;
  createdAt: number;
  lastLoginAt: number | null;
}

export interface Session {
  token: string;
  userId: string;
  device: string;
  createdAt: number;
  expiresAt: number;
}

export interface AuditEntry {
  id: string;
  at: number;
  level: LogLevel;
  actor: string;
  action: string;
  detail: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  blurb: string;
}

export interface Specs {
  display: string;
  chip: string;
  ram: string;
  storage: string;
  battery: string;
  camera: string;
  os: string;
  fiveG: boolean;
  weight: string;
}

export interface Visual {
  body: string;
  screenA: string;
  screenB: string;
}

export interface Deal {
  percent: number;
  endsAt: number;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  categoryId: string;
  price: number;
  compareAt: number | null;
  stock: number;
  sold: number;
  featured: boolean;
  deal: Deal | null;
  visual: Visual;
  gallery: string[]; // extra body finishes
  specs: Specs;
  description: string;
  highlights: string[];
  status: ProductStatus;
  createdAt: number;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  name: string;
  rating: number;
  comment: string;
  createdAt: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  brand: string;
  price: number;
  qty: number;
  body: string;
  screenA: string;
  screenB: string;
}

export interface Address {
  name: string;
  phone: string;
  line: string;
  city: string;
  zip: string;
}

export interface Order {
  id: string;
  userId: string;
  email: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode: string | null;
  shipping: number;
  total: number;
  address: Address;
  payment: PaymentMethod;
  status: OrderStatus;
  timeline: { status: OrderStatus; at: number }[];
  createdAt: number;
}

export interface Coupon {
  id: string;
  code: string;
  kind: "percent" | "fixed";
  value: number;
  minOrder: number;
  expiresAt: number | null;
  active: boolean;
  used: number;
}

export interface Slide {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  cta: string;
  link: string;
  image: string | null;
  art: { from: string; to: string; body: string; screenA: string; screenB: string } | null;
  active: boolean;
  order: number;
}

export interface Settings {
  storeName: string;
  tagline: string;
  announcement: string;
  shippingFee: number;
  freeShipOver: number;
  lowStockThreshold: number;
}

export interface CartItem {
  productId: string;
  qty: number;
}

export interface DbShape {
  users: User[];
  sessions: Session[];
  categories: Category[];
  products: Product[];
  reviews: Review[];
  orders: Order[];
  coupons: Coupon[];
  slides: Slide[];
  settings: Settings;
  newsletter: string[];
  seededAt: number;
}

export const ORDER_FLOW: OrderStatus[] = ["pending", "confirmed", "shipped", "delivered"];

export function dealPrice(p: Product): number {
  if (!p.deal) return p.price;
  return Math.round(p.price * (1 - p.deal.percent / 100));
}
