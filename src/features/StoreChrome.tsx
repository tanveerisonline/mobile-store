import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { Product } from "../types";
import { dealPrice } from "../types";
import { useApp } from "../context/AppContext";
import { can, PERMS } from "../lib/rbac";
import { catalogService } from "../services/catalogService";
import { commerceService } from "../services/commerceService";
import type { Route } from "../lib/utils";
import { cx, money, navigate, timeAgo } from "../lib/utils";
import { Icon } from "../components/icons";
import { Badge, Button, Drawer, EmptyState, Price, Stars, Stepper } from "../components/ui";
import { PhoneArt, PhoneTile } from "../components/PhoneArt";

/* ------------------------------ Header ------------------------------ */

function Header({ route }: { route: Route }) {
  const { user, cartCount, setCartOpen, signOut, wishlist, dbVersion } = useApp();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  void dbVersion;
  const settings = commerceService.settings();

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/shop${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
    setMobileSearch(false);
  };

  const navLink = (to: string, label: string) => {
    const active = route.path === to || (to !== "/" && route.path.startsWith(to));
    return (
      <button
        onClick={() => navigate(to)}
        className={cx(
          "relative px-1 py-2 text-sm font-extrabold tracking-wide transition-colors",
          active ? "text-volt" : "text-paper/65 hover:text-paper"
        )}
      >
        {label}
        {active && <span className="absolute left-0 right-0 -bottom-[13px] h-[3px] bg-volt" />}
      </button>
    );
  };

  return (
    <header className="sticky top-0 z-50">
      <div className="bg-volt text-ink text-center text-[11.5px] font-extrabold tracking-wide px-3 py-1.5">
        ⚡ {settings.announcement}
      </div>
      <div className="bg-ink text-paper border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-4 h-16">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 shrink-0 group" aria-label="VOLT Mobile home">
            <span className="w-9 h-9 grid place-items-center bg-volt text-ink notch-sm group-hover:bg-voltl transition-colors">
              <Icon name="bolt" size={20} />
            </span>
            <span className="font-d font-bold text-[17px] tracking-tight leading-none">
              VOLT<span className="text-volt">·</span>MOBILE
            </span>
          </button>

          <nav className="hidden md:flex items-center gap-6 ml-6">
            {navLink("/", "Home")}
            {navLink("/shop", "Shop")}
            {navLink("/deals", "Flash Deals")}
            {navLink("/account?t=wishlist", "Wishlist")}
          </nav>

          <form onSubmit={submitSearch} className="hidden lg:flex items-center grow max-w-sm ml-auto bg-ink2 border border-line focus-within:border-volt transition-colors notch-sm">
            <Icon name="search" size={16} className="ml-3 text-paper/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search phones, brands…"
              className="bg-transparent px-2.5 py-2 text-sm font-semibold w-full outline-none placeholder:text-paper/30"
            />
          </form>

          <div className="flex items-center gap-1 sm:gap-2 ml-auto lg:ml-3">
            <button onClick={() => setMobileSearch((v) => !v)} className="lg:hidden p-2.5 text-paper/70 hover:text-volt transition-colors" aria-label="Search">
              <Icon name="search" size={20} />
            </button>
            <button onClick={() => navigate("/account?t=wishlist")} className="relative p-2.5 text-paper/70 hover:text-volt transition-colors" aria-label="Wishlist">
              <Icon name="heart" size={20} />
              {wishlist.length > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 grid place-items-center bg-tang text-white text-[10px] font-extrabold rounded-full">
                  {wishlist.length}
                </span>
              )}
            </button>
            <button onClick={() => setCartOpen(true)} className="relative p-2.5 text-paper/70 hover:text-volt transition-colors" aria-label="Cart">
              <Icon name="cart" size={20} />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 grid place-items-center bg-volt text-ink text-[10px] font-extrabold rounded-full pop-in">
                  {cartCount}
                </span>
              )}
            </button>

            {user ? (
              <div className="relative">
                <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2 pl-1.5 pr-1 py-1 hover:bg-ink2 transition-colors notch-sm">
                  <span className="w-8 h-8 grid place-items-center bg-volt/20 text-volt text-xs font-extrabold rounded-full border border-volt/40">
                    {user.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </span>
                  <Icon name="chevD" size={14} className="hidden sm:block text-paper/50" />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-ink2 border border-line shadow-2xl z-50 fade-up py-1.5">
                      <div className="px-4 py-2.5 border-b border-line">
                        <p className="text-sm font-extrabold truncate">{user.name}</p>
                        <p className="text-[11px] font-bold text-paper/40 truncate">{user.email}</p>
                      </div>
                      {can(user.role, PERMS.DASH) && (
                        <MenuItem icon="board" label="Admin console" onClick={() => { setMenuOpen(false); navigate("/dashboard"); }} />
                      )}
                      <MenuItem icon="box" label="My orders" onClick={() => { setMenuOpen(false); navigate("/account?t=orders"); }} />
                      <MenuItem icon="user" label="Profile & security" onClick={() => { setMenuOpen(false); navigate("/account"); }} />
                      <MenuItem icon="logout" label="Sign out" danger onClick={() => { setMenuOpen(false); signOut(); }} />
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Button size="sm" onClick={() => navigate("/auth")} className="ml-1">
                Sign in
              </Button>
            )}
          </div>
        </div>
        {mobileSearch && (
          <form onSubmit={submitSearch} className="lg:hidden px-4 pb-3 fade-up">
            <div className="flex items-center bg-ink2 border border-line focus-within:border-volt notch-sm">
              <Icon name="search" size={16} className="ml-3 text-paper/40" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search phones, brands…"
                className="bg-transparent px-2.5 py-2.5 text-sm font-semibold w-full outline-none placeholder:text-paper/30"
              />
              <button type="submit" className="px-3 text-volt font-extrabold text-sm">
                Go
              </button>
            </div>
          </form>
        )}
      </div>
    </header>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: string; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-left transition-colors",
        danger ? "text-bad hover:bg-bad/10" : "text-paper/80 hover:bg-ink3 hover:text-paper"
      )}
    >
      <Icon name={icon} size={16} /> {label}
    </button>
  );
}

/* --------------------------- Mobile tab bar -------------------------- */

function MobileTabBar({ route }: { route: Route }) {
  const { cartCount, setCartOpen } = useApp();
  const tab = (active: boolean) =>
    cx("relative flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-extrabold tracking-wide transition-colors", active ? "text-volt" : "text-paper/50");
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-ink border-t border-line tab-safe">
      <div className="grid grid-cols-5">
        <button className={tab(route.path === "/")} onClick={() => navigate("/")}>
          <Icon name="home" size={20} /> Home
        </button>
        <button className={tab(route.path === "/shop" || route.path === "/deals")} onClick={() => navigate("/shop")}>
          <Icon name="phone" size={20} /> Shop
        </button>
        <button className={tab(false)} onClick={() => setCartOpen(true)}>
          <span className="relative">
            <Icon name="cart" size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-0.5 grid place-items-center bg-volt text-ink text-[9px] font-extrabold rounded-full">
                {cartCount}
              </span>
            )}
          </span>
          Cart
        </button>
        <button className={tab(route.path === "/account" && route.query.get("t") === "orders")} onClick={() => navigate("/account?t=orders")}>
          <Icon name="box" size={20} /> Orders
        </button>
        <button className={tab(route.path === "/account" && route.query.get("t") !== "orders")} onClick={() => navigate("/account")}>
          <Icon name="user" size={20} /> Account
        </button>
      </div>
    </nav>
  );
}

/* ----------------------------- Cart drawer --------------------------- */

function CartDrawer() {
  const { cart, cartOpen, setCartOpen, setCartQty, removeFromCart, dbVersion } = useApp();
  void dbVersion;
  const settings = commerceService.settings();

  const lines = useMemo(
    () =>
      cart
        .map((c) => ({ item: c, product: catalogService.byId(c.productId) }))
        .filter((l) => l.product) as { item: { productId: string; qty: number }; product: Product }[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cart, cartOpen, dbVersion]
  );

  const subtotal = lines.reduce((s, l) => s + dealPrice(l.product) * l.item.qty, 0);
  const remaining = Math.max(0, settings.freeShipOver - subtotal);
  const progress = Math.min(100, (subtotal / settings.freeShipOver) * 100);

  return (
    <Drawer
      open={cartOpen}
      onClose={() => setCartOpen(false)}
      title={`Your cart (${lines.reduce((s, l) => s + l.item.qty, 0)})`}
      footer={
        lines.length > 0 ? (
          <div>
            <div className="flex justify-between items-baseline mb-3">
              <span className="text-sm font-extrabold text-ink/60">Subtotal</span>
              <span className="font-d text-xl font-bold">{money(subtotal)}</span>
            </div>
            <Button full size="lg" iconRight="arrowR" onClick={() => { setCartOpen(false); navigate("/checkout"); }}>
              Secure checkout
            </Button>
            <button onClick={() => { setCartOpen(false); navigate("/cart"); }} className="w-full mt-2.5 text-sm font-extrabold text-ink/50 hover:text-ink transition-colors">
              View full cart
            </button>
          </div>
        ) : undefined
      }
    >
      {lines.length === 0 ? (
        <EmptyState icon="cart" title="Cart is empty" sub="Charge it up with a new device." action={<Button variant="dark" onClick={() => { setCartOpen(false); navigate("/shop"); }}>Browse phones</Button>} />
      ) : (
        <div className="space-y-4">
          <div className="bg-white border border-linel p-3 notch-sm">
            <p className="text-xs font-extrabold text-ink/60 mb-2 flex items-center gap-1.5">
              <Icon name="truck" size={14} className="text-voltd" />
              {remaining > 0 ? (
                <>Add {money(remaining)} more for free express shipping</>
              ) : (
                <span className="text-ok">You unlocked free express shipping ⚡</span>
              )}
            </p>
            <div className="h-1.5 bg-ink/10 overflow-hidden">
              <div className="h-full bg-volt transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {lines.map(({ item, product }) => (
            <div key={item.productId} className="flex gap-3 bg-white border border-linel p-3">
              <div className="w-16 h-20 shrink-0">
                <PhoneTile visual={product.visual} height="h-20" tilt={-4} />
              </div>
              <div className="grow min-w-0">
                <p className="text-[13px] font-extrabold leading-tight truncate">{product.name}</p>
                <p className="text-[11px] font-bold text-ink/40">{product.brand}</p>
                <div className="flex items-center justify-between mt-2 gap-2">
                  <Stepper small value={item.qty} max={product.stock} onChange={(v) => setCartQty(item.productId, v)} />
                  <span className="font-d text-sm font-bold tabular-nums">{money(dealPrice(product) * item.qty)}</span>
                </div>
              </div>
              <button onClick={() => removeFromCart(item.productId)} className="self-start p-1.5 text-ink/35 hover:text-bad transition-colors" aria-label="Remove">
                <Icon name="trash" size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}

/* ----------------------------- Product card -------------------------- */

export function ProductCard({ product, compact }: { product: Product; compact?: boolean }) {
  const { addToCart, wishlist, toggleWish, dbVersion } = useApp();
  void dbVersion;
  const settings = commerceService.settings();
  const rating = catalogService.ratingFor(product.id);
  const wished = wishlist.includes(product.id);
  const price = dealPrice(product);
  const isNew = Date.now() - product.createdAt < 7 * 86400000;
  const low = product.stock > 0 && product.stock <= settings.lowStockThreshold;

  return (
    <div
      className="group relative bg-white border border-linel card-lift cursor-pointer flex flex-col"
      onClick={() => navigate(`/product/${product.id}`)}
    >
      <PhoneTile visual={product.visual} height={compact ? "h-40" : "h-48"}>
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 items-start">
          {product.deal && <Badge tone="tang">-{product.deal.percent}%</Badge>}
          {isNew && <Badge tone="volt">New</Badge>}
          {low && <Badge tone="warn">Only {product.stock} left</Badge>}
          {product.stock === 0 && <Badge tone="bad">Sold out</Badge>}
        </div>
      </PhoneTile>

      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleWish(product.id);
        }}
        aria-label="Toggle wishlist"
        className={cx(
          "absolute top-2.5 right-2.5 w-8 h-8 grid place-items-center bg-white/90 border border-linel transition-all hover:scale-110",
          wished ? "text-tang" : "text-ink/40 hover:text-tang"
        )}
      >
        <Icon name={wished ? "heartFill" : "heart"} size={16} />
      </button>

      <div className="p-4 flex flex-col grow">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink/40">{product.brand}</span>
          <Stars value={rating.avg} size={11} showValue={rating.count > 0} />
        </div>
        <p className="text-[15px] font-extrabold leading-snug line-clamp-2 mb-2 group-hover:text-voltd transition-colors">{product.name}</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          <Chip>{product.specs.ram}</Chip>
          <Chip>{product.specs.storage}</Chip>
          {product.specs.fiveG && <Chip>5G</Chip>}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2">
          <Price value={price} compareAt={product.compareAt ?? (product.deal ? product.price : null)} size="sm" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              addToCart(product.id);
            }}
            disabled={product.stock === 0}
            className={cx(
              "w-9 h-9 grid place-items-center notch-sm transition-all active:scale-90",
              product.stock === 0 ? "bg-ink/10 text-ink/30" : "bg-ink text-volt hover:bg-volt hover:text-ink"
            )}
            aria-label="Add to cart"
          >
            <Icon name="cart" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return <span className="px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide bg-mist text-ink/55 border border-linel">{children}</span>;
}

/* ------------------------------ Footer ------------------------------- */

function Footer() {
  const { toast } = useApp();
  const cats = catalogService.categories();
  return (
    <footer className="bg-ink text-paper mt-20 pb-16 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-9 h-9 grid place-items-center bg-volt text-ink notch-sm">
              <Icon name="bolt" size={20} />
            </span>
            <span className="font-d font-bold text-[17px]">VOLT·MOBILE</span>
          </div>
          <p className="text-sm font-semibold text-paper/50 leading-relaxed max-w-xs">
            Flagships, foldables and certified refurbs — every device bench-tested, insured and delivered charged.
          </p>
          <div className="flex gap-2 mt-5">
            {["VISA", "MC", "AMEX", "GPay"].map((p) => (
              <span key={p} className="px-2.5 py-1.5 border border-line text-[10px] font-extrabold tracking-wider text-paper/60 notch-sm">
                {p}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="font-d text-sm font-bold mb-4 text-volt">Shop</p>
          <ul className="space-y-2.5">
            {cats.slice(0, 6).map((c) => (
              <li key={c.id}>
                <button onClick={() => navigate(`/shop?cat=${c.id}`)} className="text-sm font-semibold text-paper/55 hover:text-volt transition-colors">
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-d text-sm font-bold mb-4 text-volt">Account</p>
          <ul className="space-y-2.5">
            <FooterLink label="Track my order" to="/account?t=orders" />
            <FooterLink label="Wishlist" to="/account?t=wishlist" />
            <FooterLink label="Profile & security" to="/account" />
            <FooterLink label="Sign in / register" to="/auth" />
            <FooterLink label="Admin console" to="/dashboard" />
          </ul>
        </div>
        <div>
          <p className="font-d text-sm font-bold mb-4 text-volt">Promise</p>
          <ul className="space-y-3">
            {[
              ["truck", "Free express shipping over $600"],
              ["shield", "2-year warranty on every device"],
              ["rotate", "30-day no-questions returns"],
              ["lock", "PBKDF2-secured accounts & checkout"],
            ].map(([icon, label]) => (
              <li key={label} className="flex items-center gap-2.5 text-sm font-semibold text-paper/55">
                <Icon name={icon} size={16} className="text-volt shrink-0" /> {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-paper/40">
          <span>© {new Date().getFullYear()} VOLT Mobile — demo storefront. Payments are simulated.</span>
          <button onClick={() => toast("You're reading it — this whole build is the docs ⚡", "info")} className="hover:text-volt transition-colors">
            Built with a Prisma-shaped service layer
          </button>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ label, to }: { label: string; to: string }) {
  return (
    <li>
      <button onClick={() => navigate(to)} className="text-sm font-semibold text-paper/55 hover:text-volt transition-colors">
        {label}
      </button>
    </li>
  );
}

/* ------------------------------ Shell -------------------------------- */

export function StoreChrome({ children, route }: { children: ReactNode; route: Route }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <Header route={route} />
      <main className="grow pb-16 md:pb-0">{children}</main>
      <Footer />
      <MobileTabBar route={route} />
      <CartDrawer />
    </div>
  );
}

export function MiniPhone({ visual, className }: { visual: { body: string; screenA: string; screenB: string }; className?: string }) {
  return <PhoneArt visual={visual} className={className} showReflection={false} />;
}

export function LastLoginNote({ at }: { at: number | null }) {
  if (!at) return null;
  return (
    <p className="text-xs font-bold text-paper/40">
      Last session {timeAgo(at)}
    </p>
  );
}
