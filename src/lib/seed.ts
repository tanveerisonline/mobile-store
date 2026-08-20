/* ------------------------------------------------------------------ */
/*  Demo seed — realistic catalog, users, orders, content.             */
/*  Passwords are hashed with PBKDF2 exactly like real registrations.  */
/* ------------------------------------------------------------------ */

import type { DbShape, Order, OrderItem, OrderStatus, Product, User } from "../types";
import { dealPrice } from "../types";
import { genSalt, hashPassword } from "./security";

export const IMG = {
  heroTitanium: "https://image.qwenlm.ai/generated-images/d520428a-1bdf-4ad8-a2e5-a6d47ff65065/_result.png",
  heroAmber: "https://image.qwenlm.ai/generated-images/298ea724-d100-47b7-ac98-86c4006c7c04/_result.png",
  heroFold: "https://image.qwenlm.ai/generated-images/eaca57aa-47ff-47fb-ad33-26ce4f85a9e7/_result.png",
  tradeIn: "https://image.qwenlm.ai/generated-images/f7921aab-1839-4cca-8d72-e9a75048245a/_result.png",
};

const DAY = 86400000;
const now = () => Date.now();

async function makeUser(id: string, name: string, email: string, pw: string, role: User["role"], daysAgo: number): Promise<User> {
  const salt = genSalt();
  return {
    id,
    name,
    email,
    salt,
    passHash: await hashPassword(pw, salt),
    role,
    status: "active",
    createdAt: now() - daysAgo * DAY,
    lastLoginAt: now() - Math.floor(daysAgo / 2) * DAY,
  };
}

const P = (
  id: string,
  name: string,
  brand: string,
  categoryId: string,
  price: number,
  stock: number,
  sold: number,
  visual: Product["visual"],
  specs: Product["specs"],
  description: string,
  highlights: string[],
  extra: Partial<Product> = {}
): Product => ({
  id,
  name,
  brand,
  categoryId,
  price,
  compareAt: null,
  stock,
  sold,
  featured: false,
  deal: null,
  visual,
  gallery: [visual.body],
  specs,
  description,
  highlights,
  status: "active",
  createdAt: now() - Math.floor(Math.random() * 40 + 3) * DAY,
  ...extra,
});

function buildProducts(): Product[] {
  return [
    P("p1", "iPhone 15 Pro Max", "Apple", "c1", 1199, 14, 231,
      { body: "#4b515d", screenA: "#0e1e33", screenB: "#2f6bff" },
      { display: '6.7" LTPO OLED · 120Hz', chip: "A17 Pro", ram: "8 GB", storage: "256 GB", battery: "4,441 mAh", camera: "48 MP triple + 5× tele", os: "iOS 17", fiveG: true, weight: "221 g" },
      "The first iPhone built in aerospace-grade titanium. A17 Pro unlocks console-class gaming and the most powerful camera system Apple has ever shipped.",
      ["Titanium unibody, 19% lighter", "A17 Pro — 3nm console-class GPU", "5× telephoto with sensor-shift OIS", "USB-C 3 with 20 Gb/s transfer"],
      { featured: true, compareAt: 1299, gallery: ["#4b515d", "#2e3238", "#8a8f98"], createdAt: now() - 6 * DAY }),
    P("p2", "Galaxy S24 Ultra", "Samsung", "c1", 1299, 9, 187,
      { body: "#33363d", screenA: "#1c2027", screenB: "#9fb4c4" },
      { display: '6.8" QHD+ AMOLED · 120Hz', chip: "Snapdragon 8 Gen 3", ram: "12 GB", storage: "256 GB", battery: "5,000 mAh", camera: "200 MP quad + S Pen", os: "Android 14 · One UI 6", fiveG: true, weight: "232 g" },
      "Galaxy AI meets a 200 MP sensor and the built-in S Pen. Seven years of OS upgrades make this the longest-haul Android flagship ever.",
      ["Galaxy AI: live translate & circle-to-search", "200 MP main camera with AI zoom", "Titanium frame, flat QHD+ display", "7 years of OS & security updates"],
      { featured: true, gallery: ["#33363d", "#5c5a52", "#7d5fb0"] }),
    P("p3", "Pixel 8 Pro", "Google", "c1", 999, 21, 154,
      { body: "#3d4a52", screenA: "#12262e", screenB: "#7fd0c9" },
      { display: '6.7" LTPO OLED · 120Hz', chip: "Tensor G3", ram: "12 GB", storage: "128 GB", battery: "5,050 mAh", camera: "50 MP triple + pro controls", os: "Android 14", fiveG: true, weight: "213 g" },
      "Google's most advanced phone: Tensor G3 on-device AI, Magic Editor, and a pro-grade triple camera that shoots like it reads your mind.",
      ["Magic Editor & Best Take AI", "Pro camera with manual RAW control", "Temperature sensor built in", "7 years of Pixel Updates"],
      { featured: true, compareAt: 1099, deal: { percent: 15, endsAt: now() + 2 * DAY }, gallery: ["#3d4a52", "#cfd6d3", "#e8b7a0"] }),
    P("p4", "OnePlus 12", "OnePlus", "c1", 799, 18, 98,
      { body: "#1f4038", screenA: "#0e2620", screenB: "#35c29a" },
      { display: '6.82" 2K AMOLED · 120Hz', chip: "Snapdragon 8 Gen 3", ram: "12 GB", storage: "256 GB", battery: "5,400 mAh", camera: "50 MP Hasselblad triple", os: "Android 14 · OxygenOS 14", fiveG: true, weight: "220 g" },
      "A 5,400 mAh silicon-carbon cell that refuels in 25 minutes, wrapped around a Hasselblad-tuned camera and the brightest 2K panel in its class.",
      ["100W SUPERVOOC — 1–100% in 25 min", "5,400 mAh silicon-carbon battery", "Hasselblad 4th-gen colour science", "4,500-nit peak brightness display"],
      { gallery: ["#1f4038", "#111417"] }),
    P("p5", "Xiaomi 14", "Xiaomi", "c1", 699, 25, 76,
      { body: "#e8e4dc", screenA: "#26221c", screenB: "#e8a33d" },
      { display: '6.36" LTPO AMOLED · 120Hz', chip: "Snapdragon 8 Gen 3", ram: "12 GB", storage: "256 GB", battery: "4,610 mAh", camera: "50 MP Leica triple", os: "Android 14 · HyperOS", fiveG: true, weight: "193 g" },
      "Compact flagship with a full Leica Summilux triple camera system. Small in the hand, enormous on the spec sheet.",
      ["Leica Summilux optics + Leica looks", "Compact 6.36\" 1.5K 120Hz panel", "90W wired + 50W wireless charging", "IP68 aluminium unibody"],
      { gallery: ["#e8e4dc", "#17181c", "#3f6f5f"] }),
    P("p6", "iPhone 15", "Apple", "c2", 829, 30, 260,
      { body: "#f0c9d4", screenA: "#33202a", screenB: "#f28bb0" },
      { display: '6.1" OLED · 60Hz', chip: "A16 Bionic", ram: "6 GB", storage: "128 GB", battery: "3,349 mAh", camera: "48 MP dual + 2× tele", os: "iOS 17", fiveG: true, weight: "171 g" },
      "The crowd favourite gets the 48 MP main camera, Dynamic Island and USB-C. Colour-infused glass back in five pastel finishes.",
      ["48 MP main camera with 2× tele", "Dynamic Island on the standard model", "USB-C — one cable for everything", "A16 Bionic all-day efficiency"],
      { featured: true, gallery: ["#f0c9d4", "#bfd8d2", "#c9d4e8", "#17181c"] }),
    P("p7", "Galaxy Z Fold5", "Samsung", "c4", 1799, 5, 43,
      { body: "#27405c", screenA: "#101f30", screenB: "#5fa8e8" },
      { display: '7.6" foldable AMOLED · 120Hz', chip: "Snapdragon 8 Gen 2", ram: "12 GB", storage: "512 GB", battery: "4,400 mAh", camera: "50 MP triple", os: "Android 14 · One UI 6", fiveG: true, weight: "253 g" },
      "A tablet that folds into a phone. Flex Mode, a 7.6-inch canvas and the new slim hinge make the Fold5 the definitive multitasker.",
      ["7.6\" main canvas + 6.2\" cover screen", "New slim hinge — folds flat", "Run 3 apps side-by-side with taskbar", "IPX8 water resistant frame"],
      { featured: true, compareAt: 1899, gallery: ["#27405c", "#e8e0d4", "#17181c"] }),
    P("p8", "Galaxy A55 5G", "Samsung", "c2", 449, 40, 310,
      { body: "#b3c7e6", screenA: "#1e2a40", screenB: "#7fa3e0" },
      { display: '6.6" AMOLED · 120Hz', chip: "Exynos 1480", ram: "8 GB", storage: "128 GB", battery: "5,000 mAh", camera: "50 MP OIS triple", os: "Android 14", fiveG: true, weight: "213 g" },
      "Metal frame, glass back, 120 Hz AMOLED and four years of updates — the mid-range that keeps flagship manners.",
      ["Metal frame + Gorilla Glass Victus+", "120Hz Super AMOLED display", "4 years of OS upgrades", "5,000 mAh two-day battery"],
      { gallery: ["#b3c7e6", "#cde3d8", "#3a3f4a"] }),
    P("p9", "Pixel 8a", "Google", "c2", 499, 3, 122,
      { body: "#9fd0c9", screenA: "#173330", screenB: "#d8f2ee" },
      { display: '6.1" OLED · 120Hz', chip: "Tensor G3", ram: "8 GB", storage: "128 GB", battery: "4,492 mAh", camera: "64 MP dual", os: "Android 14", fiveG: true, weight: "188 g" },
      "All of Google's AI camera tricks — Magic Eraser, Best Take, Night Sight — in the friendliest-priced Pixel ever. Now almost gone.",
      ["Tensor G3 — same as Pixel 8 Pro", "7 years of updates, day one", "120Hz Actua display", "IP67 + wireless charging"],
      { gallery: ["#9fd0c9", "#17181c", "#cfe8a8"] }),
    P("p10", "OnePlus Nord CE4", "OnePlus", "c3", 349, 35, 145,
      { body: "#4a5f43", screenA: "#1d2a18", screenB: "#a8d878" },
      { display: '6.7" AMOLED · 120Hz', chip: "Snapdragon 7 Gen 3", ram: "8 GB", storage: "128 GB", battery: "5,500 mAh", camera: "50 MP OIS dual", os: "Android 14 · OxygenOS", fiveG: true, weight: "186 g" },
      "The budget king of endurance: a 5,500 mAh cell with 100W charging that outlasts phones twice its price.",
      ["5,500 mAh — biggest in class", "100W charging, 0–100% in 29 min", "120Hz AMOLED, 2,150-nit peak", "Aqua Touch wet-screen input"],
      { gallery: ["#4a5f43", "#cfd6d3"] }),
    P("p11", "Redmi Note 13 Pro", "Xiaomi", "c3", 299, 50, 402,
      { body: "#7a5fd0", screenA: "#241a40", screenB: "#b8a0f0" },
      { display: '6.67" AMOLED · 120Hz', chip: "Helio G99 Ultra", ram: "8 GB", storage: "256 GB", battery: "5,000 mAh", camera: "200 MP OIS", os: "Android 13 · MIUI 14", fiveG: false, weight: "187 g" },
      "A 200 MP camera under $300 — the Redmi Note 13 Pro keeps breaking the price-to-pixel ratio. This week: extra 20% off.",
      ["200 MP OIS main camera", "1.5K 120Hz AMOLED curved panel", "67W turbo charging included", "256 GB storage standard"],
      { deal: { percent: 20, endsAt: now() + 2 * DAY }, compareAt: 349, featured: true, gallery: ["#7a5fd0", "#17181c", "#e8e0d4"] }),
    P("p12", "iPhone 13 (Certified Refurb)", "Apple", "c6", 549, 12, 88,
      { body: "#23405e", screenA: "#101c2c", screenB: "#6fa0d8" },
      { display: '6.1" OLED · 60Hz', chip: "A15 Bionic", ram: "4 GB", storage: "128 GB", battery: "3,240 mAh (new cell)", camera: "12 MP dual", os: "iOS 17", fiveG: true, weight: "174 g" },
      "Professionally refurbished with a brand-new battery, 30-point certification and the same 2-year VOLT warranty as new.",
      ["New battery, 30-point certified", "2-year VOLT warranty included", "A15 Bionic still flies", "30-day no-questions returns"],
      { compareAt: 699, gallery: ["#23405e", "#e8e0d4", "#c96a6a"] }),
    P("p13", "ROG Phone 8 Pro", "ASUS", "c5", 1099, 7, 39,
      { body: "#17181c", screenA: "#0c0d10", screenB: "#ff4655" },
      { display: '6.78" AMOLED · 165Hz', chip: "Snapdragon 8 Gen 3", ram: "16 GB", storage: "512 GB", battery: "5,500 mAh", camera: "50 MP gimbal triple", os: "Android 14 · ROG UI", fiveG: true, weight: "225 g" },
      "165 Hz, shoulder triggers, GameCool 8 vapour chamber and a 16 GB RAM ceiling — built to hold 120 fps while everyone else throttles.",
      ["165Hz LTPO panel, 720Hz touch", "AirTrigger ultrasonic shoulder keys", "GameCool 8 vapour-chamber cooling", "65W HyperCharge + bypass charging"],
      { featured: true, gallery: ["#17181c"] }),
  ];
}

function buildOrders(products: Product[], users: User[]): Order[] {
  const specs: { user: User; daysAgo: number; status: OrderStatus; items: [string, number][]; coupon?: string }[] = [
    { user: users[3], daysAgo: 13, status: "delivered", items: [["p6", 1], ["p11", 1]], coupon: "VOLT10" },
    { user: users[4], daysAgo: 12, status: "delivered", items: [["p1", 1]] },
    { user: users[3], daysAgo: 10, status: "delivered", items: [["p10", 2]] },
    { user: users[4], daysAgo: 8, status: "delivered", items: [["p8", 1], ["p12", 1]] },
    { user: users[3], daysAgo: 6, status: "shipped", items: [["p3", 1]], coupon: "WELCOME50" },
    { user: users[4], daysAgo: 5, status: "shipped", items: [["p13", 1]] },
    { user: users[3], daysAgo: 3, status: "confirmed", items: [["p2", 1]] },
    { user: users[4], daysAgo: 2, status: "confirmed", items: [["p5", 1], ["p11", 2]] },
    { user: users[3], daysAgo: 1, status: "pending", items: [["p4", 1]] },
    { user: users[4], daysAgo: 0, status: "pending", items: [["p9", 1], ["p10", 1]] },
  ];

  const SHIP_FEE = 15;
  const FREE_OVER = 600;

  return specs.map((s, idx) => {
    const items: OrderItem[] = s.items.map(([pid, qty]) => {
      const p = products.find((x) => x.id === pid)!;
      return {
        productId: p.id,
        name: p.name,
        brand: p.brand,
        price: dealPrice(p),
        qty,
        body: p.visual.body,
        screenA: p.visual.screenA,
        screenB: p.visual.screenB,
      };
    });
    const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    let discount = 0;
    if (s.coupon === "VOLT10") discount = Math.round(subtotal * 0.1);
    if (s.coupon === "WELCOME50" && subtotal >= 500) discount = 50;
    const shipping = subtotal - discount >= FREE_OVER ? 0 : SHIP_FEE;
    const createdAt = now() - s.daysAgo * DAY - (idx % 5) * 3600000;
    const flow: OrderStatus[] = ["pending", "confirmed", "shipped", "delivered"];
    const upto = flow.indexOf(s.status);
    const timeline = flow.slice(0, upto + 1).map((status, i) => ({ status, at: createdAt + i * DAY * 0.8 }));
    return {
      id: `VLT-${(91034 + idx * 137).toString()}`,
      userId: s.user.id,
      email: s.user.email,
      items,
      subtotal,
      discount,
      couponCode: s.coupon ?? null,
      shipping,
      total: subtotal - discount + shipping,
      address: {
        name: s.user.name,
        phone: "+1 555 01" + (10 + idx),
        line: `${42 + idx * 7} Circuit Avenue`,
        city: idx % 2 ? "Austin" : "Seattle",
        zip: `980${10 + idx}`,
      },
      payment: idx % 3 === 0 ? "cod" : "card",
      status: s.status,
      timeline,
      createdAt,
    };
  });
}

export async function buildSeed(): Promise<DbShape> {
  const users = [
    await makeUser("u_admin", "Ava Sterling", "admin@volt.store", "Admin@123", "admin", 120),
    await makeUser("u_editor", "Noah Fields", "editor@volt.store", "Editor@123", "editor", 90),
    await makeUser("u_viewer", "Mia Chen", "viewer@volt.store", "Viewer@123", "viewer", 60),
    await makeUser("u_liam", "Liam Carter", "liam@demo.io", "Liam@1234", "customer", 30),
    await makeUser("u_zoe", "Zoe Ramirez", "zoe@demo.io", "Zoe@12345", "customer", 21),
  ];

  const products = buildProducts();

  return {
    users,
    sessions: [],
    categories: [
      { id: "c1", name: "Flagship", slug: "flagship", icon: "flag", blurb: "Top-tier powerhouses" },
      { id: "c2", name: "Mid-Range", slug: "mid-range", icon: "scale", blurb: "Smartest value picks" },
      { id: "c3", name: "Budget", slug: "budget", icon: "coin", blurb: "Big specs, small bill" },
      { id: "c4", name: "Foldable", slug: "foldable", icon: "fold", blurb: "Bend the rules" },
      { id: "c5", name: "Gaming", slug: "gaming", icon: "gamepad", blurb: "Frame-rate machines" },
      { id: "c6", name: "Refurbished", slug: "refurbished", icon: "refresh", blurb: "Certified second life" },
    ],
    products,
    reviews: [
      { id: "r1", productId: "p1", userId: "u_liam", name: "Liam Carter", rating: 5, comment: "Titanium feels unreal in hand and the 5× zoom replaced my compact camera entirely.", createdAt: now() - 4 * DAY },
      { id: "r2", productId: "p1", userId: "u_zoe", name: "Zoe Ramirez", rating: 4, comment: "Battery easily lasts a full heavy day. Wish it charged faster, but that's the only gripe.", createdAt: now() - 9 * DAY },
      { id: "r3", productId: "p3", userId: "u_zoe", name: "Zoe Ramirez", rating: 5, comment: "Magic Editor saved a dozen holiday photos. The AI tricks are actually useful, not gimmicks.", createdAt: now() - 2 * DAY },
      { id: "r4", productId: "p2", userId: "u_liam", name: "Liam Carter", rating: 5, comment: "S Pen + DeX turns this into a pocket workstation. Circle-to-search is addictive.", createdAt: now() - 6 * DAY },
      { id: "r5", productId: "p7", userId: "u_liam", name: "Liam Carter", rating: 4, comment: "The fold crease basically disappears after day one. Multitasking is on another level.", createdAt: now() - 11 * DAY },
      { id: "r6", productId: "p11", userId: "u_zoe", name: "Zoe Ramirez", rating: 5, comment: "200MP for under $300 felt like a typo. Photos genuinely compete with my old flagship.", createdAt: now() - 1 * DAY },
      { id: "r7", productId: "p11", userId: "u_liam", name: "Liam Carter", rating: 4, comment: "Bought two for my parents. Screen is gorgeous, charging brick actually in the box.", createdAt: now() - 5 * DAY },
      { id: "r8", productId: "p9", userId: "u_liam", name: "Liam Carter", rating: 5, comment: "Best small Android phone right now. Camera punches way above the price.", createdAt: now() - 3 * DAY },
    ],
    orders: buildOrders(products, users),
    coupons: [
      { id: "cp1", code: "VOLT10", kind: "percent", value: 10, minOrder: 0, expiresAt: null, active: true, used: 41 },
      { id: "cp2", code: "WELCOME50", kind: "fixed", value: 50, minOrder: 500, expiresAt: null, active: true, used: 18 },
      { id: "cp3", code: "FLASH5", kind: "percent", value: 5, minOrder: 0, expiresAt: now() + 30 * DAY, active: false, used: 7 },
    ],
    slides: [
      {
        id: "s1", badge: "New arrival", title: "iPhone 15 Pro", subtitle: "Titanium. So strong. So light. So Pro.",
        cta: "Shop iPhone 15 Pro", link: "/product/p1", image: IMG.heroTitanium, art: null, active: true, order: 1,
      },
      {
        id: "s2", badge: "Deal of the week", title: "Galaxy Z Fold5", subtitle: "Unfold your whole world on a 7.6-inch canvas.",
        cta: "Explore the Fold5", link: "/product/p7", image: IMG.heroFold, art: null, active: true, order: 2,
      },
      {
        id: "s3", badge: "AI inside", title: "Pixel 8 Pro", subtitle: "The best of Google — now 15% off this week only.",
        cta: "Grab the deal", link: "/product/p3", image: IMG.heroAmber, art: null, active: true, order: 3,
      },
    ],
    settings: {
      storeName: "VOLT Mobile",
      tagline: "Power in your pocket",
      announcement: "Free express shipping over $600 · 30-day returns · 2-year warranty on everything",
      shippingFee: 15,
      freeShipOver: 600,
      lowStockThreshold: 8,
    },
    newsletter: [],
    seededAt: now(),
  };
}
