import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Perm } from "../../lib/rbac";
import { can, PERMS, ROLE_LABEL, ROLE_TONE } from "../../lib/rbac";
import { useApp } from "../../context/AppContext";
import { commerceService } from "../../services/commerceService";
import { logger } from "../../lib/logger";
import { rateLimiter } from "../../lib/security";
import type { Route } from "../../lib/utils";
import { cx, money, navigate, timeAgo } from "../../lib/utils";
import { Icon } from "../../components/icons";
import { Badge, Button, Forbidden, Stat, StatusBadge } from "../../components/ui";
import { PhoneArt } from "../../components/PhoneArt";

interface NavItem {
  to: string;
  label: string;
  icon: string;
  perm: Perm;
}

const NAV: { group: string; items: NavItem[] }[] = [
  { group: "", items: [{ to: "/dashboard", label: "Overview", icon: "gauge", perm: PERMS.DASH }] },
  {
    group: "Catalog",
    items: [
      { to: "/dashboard/products", label: "Products", icon: "box", perm: PERMS.PROD_R },
      { to: "/dashboard/sliders", label: "Hero sliders", icon: "image", perm: PERMS.SLIDE_W },
      { to: "/dashboard/coupons", label: "Coupons", icon: "tag", perm: PERMS.COUPON_W },
    ],
  },
  { group: "Sales", items: [{ to: "/dashboard/orders", label: "Orders", icon: "cart", perm: PERMS.ORDER_R }] },
  { group: "Access", items: [{ to: "/dashboard/users", label: "Users & roles", icon: "users", perm: PERMS.USERS }] },
  {
    group: "System",
    items: [
      { to: "/dashboard/settings", label: "Store settings", icon: "gear", perm: PERMS.SETTINGS },
      { to: "/dashboard/security", label: "Security & audit", icon: "shield", perm: PERMS.AUDIT },
    ],
  },
];

const TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/products": "Products & categories",
  "/dashboard/sliders": "Hero sliders",
  "/dashboard/coupons": "Coupons",
  "/dashboard/orders": "Orders",
  "/dashboard/users": "Users & roles",
  "/dashboard/settings": "Store settings",
  "/dashboard/security": "Security & audit",
};

export function DashboardShell({ route, children }: { route: Route; children: ReactNode }) {
  const { user, signOut } = useApp();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!user) navigate("/auth?next=/dashboard");
  }, [user]);

  if (!user) return null;
  if (!can(user.role, PERMS.DASH)) return <Forbidden />;

  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => can(user.role, i.perm)) })).filter((g) => g.items.length);
  const title = TITLES[route.path] ?? "Console";

  const sidebar = (
    <div className="flex flex-col h-full">
      <button onClick={() => { navigate("/"); setNavOpen(false); }} className="flex items-center gap-2 px-5 h-16 border-b border-line shrink-0 group">
        <span className="w-8 h-8 grid place-items-center bg-volt text-white notch-sm">
          <Icon name="bolt" size={17} />
        </span>
        <span className="font-d font-bold text-[15px] text-paper">
          VOLT<span className="text-volt">·</span>OPS
        </span>
      </button>
      <nav className="grow overflow-y-auto py-4 px-3">
        {groups.map((g) => (
          <div key={g.group || "root"} className="mb-5">
            {g.group && <p className="px-2.5 mb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-paper/30">{g.group}</p>}
            {g.items.map((item) => {
              const active = route.path === item.to;
              return (
                <button
                  key={item.to}
                  onClick={() => {
                    navigate(item.to);
                    setNavOpen(false);
                  }}
                  className={cx(
                    "w-full flex items-center gap-3 px-2.5 py-2.5 mb-0.5 text-sm font-bold transition-all border-l-[3px]",
                    active ? "border-volt bg-volt/12 text-volt" : "border-transparent text-paper/55 hover:text-paper hover:bg-ink3"
                  )}
                >
                  <Icon name={item.icon} size={17} />
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="p-4 border-t border-line shrink-0">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-9 h-9 grid place-items-center bg-volt/20 text-volt text-xs font-extrabold rounded-full border border-volt/40">
            {user.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-extrabold text-paper truncate">{user.name}</p>
            <Badge tone={ROLE_TONE[user.role]}>{ROLE_LABEL[user.role]}</Badge>
          </div>
        </div>
        <Button variant="outline" size="sm" full className="!border-line !text-paper/70 hover:!text-bad hover:!border-bad" icon="logout" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-paper md:flex">
      <aside className="hidden md:block w-60 shrink-0 bg-ink sticky top-0 h-dvh border-r border-line">{sidebar}</aside>

      {navOpen && (
        <div className="fixed inset-0 z-[70] md:hidden">
          <div className="absolute inset-0 bg-ink/70" onClick={() => setNavOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-ink slide-in-left">{sidebar}</aside>
        </div>
      )}

      <div className="grow min-w-0 flex flex-col">
        <header className="sticky top-0 z-40 bg-ink text-paper border-b border-line md:bg-paper md:text-ink md:border-linel">
          <div className="flex items-center gap-3 px-4 md:px-8 h-16">
            <button className="md:hidden p-2 -ml-2 text-paper/70" onClick={() => setNavOpen(true)} aria-label="Open menu">
              <Icon name="menu" size={20} />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-volt hidden sm:block">Admin console</p>
              <h1 className="font-d text-[15px] md:text-lg font-bold truncate">{title}</h1>
            </div>
            <div className="ml-auto flex items-center gap-2.5">
              <Button variant="outline" size="sm" className="md:!border-ink/20 !border-line !text-paper md:!text-ink" icon="external" onClick={() => navigate("/")}>
                <span className="hidden sm:inline">View store</span>
              </Button>
              <span className="md:hidden w-8 h-8 grid place-items-center bg-volt/20 text-volt text-xs font-extrabold rounded-full border border-volt/40">
                {user.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </span>
            </div>
          </div>
        </header>
        <main className="grow px-4 md:px-8 py-6 md:py-8 pb-24 md:pb-8">{children}</main>
      </div>
    </div>
  );
}

/* ------------------------------ overview ----------------------------- */

export function DashboardOverview() {
  const { user, dbVersion } = useApp();
  const stats = useMemo(() => commerceService.stats(), [dbVersion]);
  const securityEvents = useMemo(() => logger.byLevel("SECURITY").filter((e) => Date.now() - e.at < 86400000).length, [dbVersion]);
  const rlBuckets = rateLimiter.snapshot().length;
  const auditTotal = logger.list().length;
  const maxBar = Math.max(1, ...stats.revenueSeries.map((d) => d.value));
  const maxTop = Math.max(1, ...stats.topProducts.map((t) => t.revenue));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2.5">
        {user && can(user.role, PERMS.PROD_W) && (
          <Button size="sm" icon="plus" onClick={() => navigate("/dashboard/products?new=1")}>Add product</Button>
        )}
        {user && can(user.role, PERMS.SLIDE_W) && (
          <Button size="sm" variant="dark" icon="image" onClick={() => navigate("/dashboard/sliders?new=1")}>New slide</Button>
        )}
        {user && can(user.role, PERMS.AUDIT) && (
          <Button size="sm" variant="outline" icon="activity" onClick={() => navigate("/dashboard/security")}>Audit log</Button>
        )}
        <span className="ml-auto text-xs font-bold text-ink/40 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-ok pulse-dot" /> Live — updates on every store mutation
        </span>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat label="Gross revenue" prefix="$" value={stats.revenue} icon="chart" note="excluding cancelled orders" />
        <Stat label="Orders" value={stats.ordersCount} icon="cart" note={`${stats.recent.length} recent`} />
        <Stat label="Customers" value={stats.customers} icon="users" note="unique buyers" />
        <Stat label="Avg order value" prefix="$" value={stats.avgOrder} icon="tag" note="across live orders" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-ink2 border border-line p-5 notch relative overflow-hidden">
          <div className="absolute -right-10 -top-16 w-56 h-56 glow-volt opacity-60" />
          <div className="flex items-center justify-between mb-5 relative">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-paper/45">Revenue · last 14 days</p>
              <p className="font-d text-xl font-bold text-paper mt-1">${stats.revenueSeries.reduce((s, d) => s + d.value, 0).toLocaleString()}</p>
            </div>
            <span className="w-9 h-9 grid place-items-center bg-volt/15 text-volt notch-sm"><Icon name="chart" size={17} /></span>
          </div>
          <div className="flex items-end gap-1.5 h-36 relative">
            {stats.revenueSeries.map((d, n) => (
              <div key={n} className="group grow flex flex-col items-center gap-1.5 h-full justify-end" title={`${d.label}: $${d.value.toLocaleString()}`}>
                <span className="text-[9px] font-extrabold text-volt opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
                  {d.value > 0 ? "$" + d.value : ""}
                </span>
                <div
                  className="w-full bg-volt/60 group-hover:bg-volt transition-all duration-300 bar-grow"
                  style={{ height: `${Math.max(3, (d.value / maxBar) * 100)}%`, animationDelay: `${n * 45}ms` }}
                />
                <span className="text-[9px] font-extrabold text-paper/35 tabular-nums">{n % 2 ? "" : d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-linel p-5 notch">
            <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-ink/45 mb-3">
              <Icon name="shield" size={13} className="text-voltd" /> Security pulse
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-mist p-2.5">
                <p className={"font-d text-lg font-bold tabular-nums " + (securityEvents > 0 ? "text-bad" : "text-ok")}>{securityEvents}</p>
                <p className="text-[9px] font-extrabold uppercase tracking-wide text-ink/45">events 24h</p>
              </div>
              <div className="bg-mist p-2.5">
                <p className="font-d text-lg font-bold tabular-nums text-ink">{rlBuckets}</p>
                <p className="text-[9px] font-extrabold uppercase tracking-wide text-ink/45">RL buckets</p>
              </div>
              <div className="bg-mist p-2.5">
                <p className="font-d text-lg font-bold tabular-nums text-ink">{auditTotal}</p>
                <p className="text-[9px] font-extrabold uppercase tracking-wide text-ink/45">log lines</p>
              </div>
            </div>
            <p className="mt-3 text-[11px] font-bold text-ink/45 leading-relaxed">
              Failed logins, denied permissions and session revocations stream into the audit log in real time.
            </p>
          </div>

          <div className="bg-white border border-linel p-5 notch">
            <p className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-[0.16em] text-ink/45 mb-3">
              <span className="flex items-center gap-2"><Icon name="alert" size={13} className="text-warn" /> Low stock</span>
              <span className="text-ink/35">{stats.lowStock.length}</span>
            </p>
            {stats.lowStock.length === 0 ? (
              <p className="text-[13px] font-bold text-ok flex items-center gap-1.5"><Icon name="check" size={14} /> All stock levels healthy</p>
            ) : (
              <div className="space-y-2">
                {stats.lowStock.slice(0, 3).map((p) => (
                  <button key={p.id} onClick={() => navigate("/dashboard/products")} className="w-full flex items-center gap-2.5 text-left group">
                    <span className="w-1 h-8 shrink-0" style={{ background: p.visual.screenB }} />
                    <span className="text-[13px] font-extrabold truncate group-hover:text-voltd transition-colors">{p.name}</span>
                    <Badge tone={p.stock === 0 ? "bad" : "warn"} className="ml-auto">{p.stock} left</Badge>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white border border-linel p-5 notch">
          <div className="flex items-center justify-between mb-4">
            <p className="font-d text-[15px] font-bold">Recent orders</p>
            <Button variant="ghost" size="sm" iconRight="arrowR" onClick={() => navigate("/dashboard/orders")}>All orders</Button>
          </div>
          <div className="space-y-1">
            {stats.recent.map((o) => (
              <button key={o.id} onClick={() => navigate("/dashboard/orders")} className="w-full flex items-center gap-3 px-2 py-2.5 hover:bg-mist transition-colors text-left">
                <span className="font-d text-[13px] font-bold w-24 shrink-0">{o.id}</span>
                <span className="text-[13px] font-bold text-ink/55 truncate grow">{o.email}</span>
                <span className="text-[11px] font-bold text-ink/40 hidden sm:block w-16">{timeAgo(o.createdAt)}</span>
                <span className="font-d text-[13px] font-bold tabular-nums w-20 text-right">{money(o.total)}</span>
                <StatusBadge status={o.status} />
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-linel p-5 notch">
          <p className="font-d text-[15px] font-bold mb-4">Top sellers</p>
          {stats.topProducts.length === 0 ? (
            <p className="text-sm font-bold text-ink/45">No sales recorded yet.</p>
          ) : (
            <div className="space-y-3.5">
              {stats.topProducts.map((t, n) => (
                <div key={t.id} className="flex items-center gap-3">
                  <span className="font-d text-xs font-bold text-ink/30 w-5">{n + 1}</span>
                  <div className="w-8 h-12 shrink-0 bg-mist grid place-items-center overflow-hidden">
                    <PhoneArt visual={{ body: t.body, screenA: t.screenA, screenB: t.screenB }} className="h-11" showReflection={false} />
                  </div>
                  <div className="grow min-w-0">
                    <div className="flex justify-between gap-3 mb-1">
                      <p className="text-[13px] font-extrabold truncate">{t.name}</p>
                      <p className="text-[13px] font-bold tabular-nums shrink-0">{money(t.revenue)}</p>
                    </div>
                    <div className="h-1.5 bg-mist overflow-hidden">
                      <div className="h-full bg-volt transition-all duration-700" style={{ width: `${(t.revenue / maxTop) * 100}%` }} />
                    </div>
                    <p className="text-[10px] font-extrabold text-ink/40 mt-1">{t.units} units moved</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
