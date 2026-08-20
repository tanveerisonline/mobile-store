import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { CartItem, User } from "../types";
import { db } from "../lib/db";
import { buildSeed } from "../lib/seed";
import { logger } from "../lib/logger";
import { authService } from "../services/authService";
import { catalogService } from "../services/catalogService";
import { uid } from "../lib/utils";

const TOKEN_KEY = "volt_session_token";
const CART_KEY = "volt_cart_v1";
const WISH_KEY = "volt_wish_v1";

export interface Toast {
  id: string;
  kind: "success" | "error" | "info";
  msg: string;
}

interface AppState {
  ready: boolean;
  user: User | null;
  dbVersion: number;
  cart: CartItem[];
  cartCount: number;
  wishlist: string[];
  toasts: Toast[];
  cartOpen: boolean;
  setCartOpen: (v: boolean) => void;
  toast: (msg: string, kind?: Toast["kind"]) => void;
  signIn: (token: string, user: User) => void;
  signOut: () => void;
  setUser: (u: User | null) => void;
  refreshUser: () => void;
  addToCart: (productId: string, qty?: number) => void;
  setCartQty: (productId: string, qty: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  toggleWish: (productId: string) => void;
  refresh: () => void;
}

const Ctx = createContext<AppState | null>(null);

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [dbVersion, setDbVersion] = useState(0);
  const [cart, setCart] = useState<CartItem[]>(() => readJson<CartItem[]>(CART_KEY, []));
  const [wishlist, setWishlist] = useState<string[]>(() => readJson<string[]>(WISH_KEY, []));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  /* ------------------------------ boot ------------------------------ */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!db.isReady()) {
        if (db.hasPersisted()) {
          db.loadPersisted();
          logger.debug("DB_LOADED", "system", "persisted store attached");
        } else {
          db.init(await buildSeed());
          logger.info("DB_SEEDED", "system", "demo dataset installed");
        }
      }
      const token = localStorage.getItem(TOKEN_KEY);
      const restored = authService.restore(token);
      if (!cancelled && restored) setUser(restored);
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => db.subscribe(() => setDbVersion((v) => v + 1)), []);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem(WISH_KEY, JSON.stringify(wishlist));
  }, [wishlist]);

  /* ------------------------------ toasts ----------------------------- */
  const toast = useCallback((msg: string, kind: Toast["kind"] = "success") => {
    const id = uid("t");
    setToasts((prev) => [...prev.slice(-3), { id, kind, msg }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3800);
  }, []);

  /* ------------------------------- auth ------------------------------ */
  const signIn = useCallback((token: string, u: User) => {
    localStorage.setItem(TOKEN_KEY, token);
    setUser(u);
  }, []);

  const signOut = useCallback(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    authService.logout(token, user?.email ?? "user");
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    window.location.hash = "/";
  }, [user]);

  const refreshUser = useCallback(() => {
    if (!user) return;
    const token = localStorage.getItem(TOKEN_KEY);
    const fresh = authService.restore(token);
    setUser(fresh);
  }, [user]);

  /* ------------------------------- cart ------------------------------ */
  const addToCart = useCallback(
    (productId: string, qty = 1) => {
      const product = catalogService.byId(productId);
      if (!product) return;
      if (product.stock <= 0) {
        toast("Out of stock — check back soon", "error");
        return;
      }
      let capped = false;
      setCart((prev) => {
        const existing = prev.find((c) => c.productId === productId);
        const current = existing?.qty ?? 0;
        const next = Math.min(current + qty, product.stock);
        capped = next === current;
        if (existing) return prev.map((c) => (c.productId === productId ? { ...c, qty: next } : c));
        return [...prev, { productId, qty: Math.min(qty, product.stock) }];
      });
      if (capped) toast(`Only ${product.stock} in stock`, "info");
      else toast(`${product.name} added to cart`);
      setCartOpen(true);
    },
    [toast]
  );

  const setCartQty = useCallback((productId: string, qty: number) => {
    const product = catalogService.byId(productId);
    const max = product ? product.stock : 99;
    setCart((prev) =>
      qty <= 0
        ? prev.filter((c) => c.productId !== productId)
        : prev.map((c) => (c.productId === productId ? { ...c, qty: Math.min(qty, max) } : c))
    );
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const toggleWish = useCallback(
    (productId: string) => {
      setWishlist((prev) => {
        const has = prev.includes(productId);
        toast(has ? "Removed from wishlist" : "Saved to wishlist ⚡", has ? "info" : "success");
        return has ? prev.filter((id) => id !== productId) : [...prev, productId];
      });
    },
    [toast]
  );

  const refresh = useCallback(() => setDbVersion((v) => v + 1), []);

  const cartCount = useMemo(() => cart.reduce((s, c) => s + c.qty, 0), [cart]);

  const value: AppState = {
    ready,
    user,
    dbVersion,
    cart,
    cartCount,
    wishlist,
    toasts,
    cartOpen,
    setCartOpen,
    toast,
    signIn,
    signOut,
    setUser,
    refreshUser,
    addToCart,
    setCartQty,
    removeFromCart,
    clearCart,
    toggleWish,
    refresh,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
