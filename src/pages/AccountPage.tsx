import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { Order } from "../types";
import { ORDER_FLOW } from "../types";
import { useApp } from "../context/AppContext";
import { authService } from "../services/authService";
import { catalogService } from "../services/catalogService";
import { commerceService } from "../services/commerceService";
import { ROLE_LABEL, ROLE_TONE } from "../lib/rbac";
import { dateFmt, money, navigate, useRoute } from "../lib/utils";
import { passwordStrength } from "../lib/security";
import { Icon } from "../components/icons";
import { Badge, Button, Confirm, EmptyState, Input, StatusBadge, Tabs } from "../components/ui";
import { PhoneTile } from "../components/PhoneArt";
import { ProductCard } from "../features/StoreChrome";

/* ------------------------------ auth page ---------------------------- */

const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@volt.store", pw: "Admin@123", tone: "tang" as const },
  { label: "Editor", email: "editor@volt.store", pw: "Editor@123", tone: "volt" as const },
  { label: "Viewer", email: "viewer@volt.store", pw: "Viewer@123", tone: "gold" as const },
  { label: "Customer", email: "liam@demo.io", pw: "Liam@1234", tone: "mist" as const },
];

export function AuthPage() {
  const route = useRoute();
  const { signIn, toast, user } = useApp();
  const next = route.query.get("next") ?? "/";
  const [mode, setMode] = useState<"login" | "register">(route.query.get("mode") === "register" ? "register" : "login");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [pw2, setPw2] = useState("");
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === "register") {
      if (pw !== pw2) return setError("Passwords do not match");
      if (!terms) return setError("Please accept the terms");
    }
    setBusy(true);
    try {
      const res = mode === "login" ? await authService.login(email, pw) : await authService.register(name, email, pw);
      signIn(res.token, res.user);
      toast(mode === "login" ? `Welcome back, ${res.user.name.split(" ")[0]} ⚡` : "Account created — welcome to VOLT");
      navigate(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const strength = passwordStrength(pw);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid lg:grid-cols-2 gap-10 items-start">
      <div className="hidden lg:block relative overflow-hidden bg-ink text-paper p-10 notch grid-dark min-h-[560px]">
        <div className="absolute -top-20 -right-20 w-80 h-80 glow-volt" />
        <div className="absolute bottom-0 -left-16 w-72 h-72 glow-tang opacity-50" />
        <p className="relative flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-volt mb-4">
          <Icon name="bolt" size={12} /> Members only
        </p>
        <h1 className="relative font-d text-4xl font-bold leading-tight">
          One account.<br />Every current<br />in the store.
        </h1>
        <ul className="relative mt-8 space-y-4">
          {[
            ["box", "Live order tracking with status timeline"],
            ["heart", "Wishlist synced to this browser"],
            ["tag", "Member coupons & early flash-deal access"],
            ["shield", "PBKDF2-hashed credentials, 24h sessions"],
          ].map(([icon, label]) => (
            <li key={label} className="flex items-center gap-3 text-sm font-bold text-paper/65">
              <span className="w-8 h-8 grid place-items-center bg-volt/15 text-volt notch-sm shrink-0">
                <Icon name={icon} size={15} />
              </span>
              {label}
            </li>
          ))}
        </ul>
        <div className="relative mt-10 border-t border-line pt-6">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-paper/40 mb-3">Demo roles — one click to fill</p>
          <div className="flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((d) => (
              <button
                key={d.label}
                onClick={() => {
                  setMode("login");
                  setEmail(d.email);
                  setPw(d.pw);
                  setError(null);
                }}
                className="px-3 py-1.5 bg-ink2 border border-line text-xs font-extrabold text-paper/70 hover:text-volt hover:border-volt transition-colors notch-sm"
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-linel p-7 sm:p-9 notch">
        <div className="flex gap-1.5 bg-mist p-1 mb-7">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={
                "flex-1 py-2.5 text-sm font-extrabold transition-all " +
                (mode === m ? "bg-ink text-paper notch-sm" : "text-ink/50 hover:text-ink")
              }
            >
              {m === "login" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <h2 className="font-d text-2xl font-bold">{mode === "login" ? "Welcome back" : "Join VOLT"}</h2>
        <p className="text-sm font-semibold text-ink/50 mt-1.5 mb-6">
          {mode === "login" ? "Sign in to check out, track orders and review devices." : "30 seconds to register — password hashed before it touches storage."}
        </p>

        {error && (
          <div className="flex items-center gap-2.5 bg-bad/10 border border-bad/30 text-bad px-4 py-3 mb-5 text-sm font-extrabold fade-up">
            <Icon name="alert" size={16} /> {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Volt" required />}
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          <div>
            <Input label="Password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" required />
            {mode === "register" && (
              <div className="mt-2">
                <div className="flex gap-1.5">
                  {[1, 2, 3].map((n) => (
                    <span key={n} className={"h-1.5 grow transition-colors " + (strength >= n ? (strength === 1 ? "bg-bad" : strength === 2 ? "bg-gold" : "bg-ok") : "bg-ink/10")} />
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] font-bold text-ink/40">Min 8 chars, one uppercase, one number. {strength === 3 ? "Strong." : strength === 2 ? "Good." : strength === 1 ? "Weak." : ""}</p>
              </div>
            )}
          </div>
          {mode === "register" && (
            <>
              <Input label="Confirm password" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="••••••••" required />
              <label className="flex items-start gap-2.5 text-[13px] font-bold text-ink/60 cursor-pointer">
                <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 accent-[#0fa8a0]" />
                I accept the demo terms — no real payments, no real data leaves this browser.
              </label>
            </>
          )}
          <Button full size="lg" type="submit" loading={busy} icon={mode === "login" ? "logout" : "user"}>
            {mode === "login" ? "Sign in securely" : "Create account"}
          </Button>
        </form>

        <div className="lg:hidden mt-6 border-t border-linel pt-5">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-ink/40 mb-2.5">Demo roles</p>
          <div className="flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((d) => (
              <button
                key={d.label}
                onClick={() => {
                  setMode("login");
                  setEmail(d.email);
                  setPw(d.pw);
                  setError(null);
                }}
                className="px-3 py-1.5 bg-mist border border-linel text-xs font-extrabold text-ink/60 hover:text-voltd transition-colors notch-sm"
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- account page -------------------------- */

export function AccountPage() {
  const route = useRoute();
  const { user, dbVersion } = useApp();
  const tab = route.query.get("t") ?? "profile";

  useEffect(() => {
    if (!user) navigate("/auth?next=/account");
  }, [user]);

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="bg-ink text-paper p-6 sm:p-7 notch grid-dark relative overflow-hidden mb-8 flex flex-wrap items-center gap-5">
        <div className="absolute -right-10 -top-20 w-64 h-64 glow-volt" />
        <span className="w-16 h-16 grid place-items-center bg-volt text-ink font-d text-xl font-bold rounded-full relative">
          {user.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
        </span>
        <div className="relative grow">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-d text-xl font-bold">{user.name}</h1>
            <Badge tone={ROLE_TONE[user.role]}>{ROLE_LABEL[user.role]}</Badge>
          </div>
          <p className="text-sm font-bold text-paper/45 mt-1">{user.email} · member since {dateFmt(user.createdAt)}</p>
        </div>
        <div className="relative flex gap-2.5">
          {user.role !== "customer" && (
            <Button variant="outline" size="sm" className="!border-paper/25 !text-paper" icon="board" onClick={() => navigate("/dashboard")}>
              Console
            </Button>
          )}
          <SignOutButton />
        </div>
      </div>

      <Tabs
        tabs={[
          { id: "profile", label: "Profile & security", icon: "user" },
          { id: "orders", label: "Orders", icon: "box" },
          { id: "wishlist", label: "Wishlist", icon: "heart" },
        ]}
        active={tab}
        onChange={(t) => navigate(`/account?t=${t}`)}
      />

      <div key={tab + dbVersion}>
        {tab === "profile" && <ProfileTab />}
        {tab === "orders" && <OrdersTab />}
        {tab === "wishlist" && <WishlistTab />}
      </div>
    </div>
  );
}

function SignOutButton() {
  const { signOut, toast } = useApp();
  return (
    <Button
      variant="outline"
      size="sm"
      className="!border-paper/25 !text-paper hover:!border-bad hover:!text-bad"
      icon="logout"
      onClick={() => {
        signOut();
        toast("Signed out — see you soon", "info");
      }}
    >
      Sign out
    </Button>
  );
}

function ProfileTab() {
  const { user, setUser, signOut, toast } = useApp();
  const [name, setName] = useState(user?.name ?? "");
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [next2, setNext2] = useState("");
  const [busy, setBusy] = useState<"name" | "pw" | null>(null);

  if (!user) return null;

  const saveName = async () => {
    setBusy("name");
    try {
      await new Promise((r) => setTimeout(r, 400));
      const updated = authService.updateProfile(user, name);
      setUser(updated);
      toast("Profile updated");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Update failed", "error");
    } finally {
      setBusy(null);
    }
  };

  const changePw = async () => {
    if (next !== next2) return toast("New passwords do not match", "error");
    setBusy("pw");
    try {
      await new Promise((r) => setTimeout(r, 400));
      await authService.changePassword(user, cur, next);
      toast("Password changed — sign in again", "info");
      window.setTimeout(() => signOut(), 600);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Change failed", "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <section className="bg-white border border-linel p-6">
        <h3 className="font-d text-base font-bold mb-4">Display name</h3>
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button className="mt-4" loading={busy === "name"} onClick={saveName} icon="check">
          Save changes
        </Button>
      </section>
      <section className="bg-white border border-linel p-6">
        <h3 className="font-d text-base font-bold mb-1">Change password</h3>
        <p className="text-xs font-bold text-ink/45 mb-4 flex items-center gap-1.5">
          <Icon name="shield" size={13} className="text-voltd" /> Rotates the hash and revokes every active session.
        </p>
        <div className="space-y-3.5">
          <Input label="Current password" type="password" value={cur} onChange={(e) => setCur(e.target.value)} />
          <Input label="New password" type="password" value={next} onChange={(e) => setNext(e.target.value)} />
          <Input label="Repeat new password" type="password" value={next2} onChange={(e) => setNext2(e.target.value)} />
        </div>
        <Button className="mt-4" variant="dark" loading={busy === "pw"} onClick={changePw} icon="key">
          Update password
        </Button>
      </section>
    </div>
  );
}

function OrdersTab() {
  const { user, dbVersion, toast, refresh } = useApp();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toCancel, setToCancel] = useState<Order | null>(null);

  const orders = useMemo(() => (user ? commerceService.ordersFor(user) : []), [user, dbVersion]);

  if (!user) return null;

  if (orders.length === 0) {
    return <EmptyState icon="box" title="No orders yet" sub="When you order, live status tracking lands here." action={<Button onClick={() => navigate("/shop")}>Start shopping</Button>} />;
  }

  return (
    <div className="space-y-4">
      {orders.map((o) => {
        const open = expanded === o.id;
        return (
          <div key={o.id} className="bg-white border border-linel">
            <button className="w-full flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4 text-left hover:bg-mist/60 transition-colors" onClick={() => setExpanded(open ? null : o.id)}>
              <span className="font-d text-sm font-bold">{o.id}</span>
              <StatusBadge status={o.status} />
              <span className="text-xs font-bold text-ink/45">{dateFmt(o.createdAt)}</span>
              <span className="text-xs font-bold text-ink/45">{o.items.reduce((s, i) => s + i.qty, 0)} item(s)</span>
              <span className="ml-auto font-d text-base font-bold tabular-nums">{money(o.total)}</span>
              <Icon name="chevD" size={16} className={"text-ink/35 transition-transform " + (open ? "rotate-180" : "")} />
            </button>
            {open && (
              <div className="px-5 pb-5 border-t border-linel fade-up">
                <div className="grid md:grid-cols-2 gap-6 pt-4">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-ink/40 mb-3">Items</p>
                    {o.items.map((i) => (
                      <div key={i.productId} className="flex items-center gap-3 py-2 border-b border-linel last:border-0">
                        <div className="w-9 h-12 shrink-0">
                          <PhoneTile visual={{ body: i.body, screenA: i.screenA, screenB: i.screenB }} height="h-12" tilt={0} />
                        </div>
                        <div className="grow">
                          <p className="text-[13px] font-extrabold">{i.name}</p>
                          <p className="text-[11px] font-bold text-ink/40">Qty {i.qty} · {money(i.price)}</p>
                        </div>
                        <span className="text-sm font-bold tabular-nums">{money(i.price * i.qty)}</span>
                      </div>
                    ))}
                    <div className="pt-3 space-y-1 text-[13px] font-bold text-ink/60">
                      <p className="flex justify-between"><span>Subtotal</span><span>{money(o.subtotal)}</span></p>
                      {o.discount > 0 && <p className="flex justify-between text-voltd"><span>Coupon {o.couponCode}</span><span>−{money(o.discount)}</span></p>}
                      <p className="flex justify-between"><span>Shipping</span><span>{o.shipping === 0 ? "FREE" : money(o.shipping)}</span></p>
                      <p className="flex justify-between text-ink font-extrabold text-sm pt-1"><span>Total</span><span className="tabular-nums">{money(o.total)}</span></p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-ink/40 mb-3">Timeline</p>
                    <OrderTimeline status={o.status} timeline={o.timeline} />
                    <div className="mt-5 bg-mist border border-linel p-3.5 text-[13px] font-bold text-ink/60 space-y-1">
                      <p className="flex items-center gap-2"><Icon name="truck" size={14} className="text-voltd" /> {o.address.line}, {o.address.city} {o.address.zip}</p>
                      <p className="flex items-center gap-2"><Icon name={o.payment === "card" ? "card" : "cash"} size={14} className="text-voltd" /> {o.payment === "card" ? "Paid by card" : "Cash on delivery"}</p>
                    </div>
                    {o.status === "pending" && (
                      <Button variant="danger" size="sm" className="mt-4" icon="x" onClick={() => setToCancel(o)}>
                        Cancel order
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <Confirm
        open={!!toCancel}
        onClose={() => setToCancel(null)}
        title={"Cancel " + (toCancel?.id ?? "")}
        body="Cancelling restocks the items immediately and cannot be undone. Continue?"
        confirmLabel="Cancel order"
        onConfirm={() => {
          if (!toCancel || !user) return;
          try {
            commerceService.cancelByCustomer(user, toCancel.id);
            toast("Order cancelled — items restocked", "info");
            refresh();
          } catch (err) {
            toast(err instanceof Error ? err.message : "Could not cancel", "error");
          }
        }}
      />
    </div>
  );
}

export function OrderTimeline({ status, timeline }: { status: string; timeline: { status: string; at: number }[] }) {
  const steps = status === "cancelled" ? [...ORDER_FLOW.slice(0, 1), "cancelled"] : ORDER_FLOW;
  const currentIdx = steps.indexOf(status as (typeof steps)[number]);
  return (
    <ol className="space-y-0">
      {steps.map((s, n) => {
        const entry = timeline.find((t) => t.status === s);
        const done = n <= currentIdx;
        const cancelled = s === "cancelled";
        return (
          <li key={s} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={
                  "w-6 h-6 grid place-items-center rounded-full border-2 text-[10px] font-extrabold " +
                  (done ? (cancelled ? "bg-bad border-bad text-white" : "bg-volt border-volt text-ink") : "border-ink/15 text-ink/30 bg-white")
                }
              >
                {done ? <Icon name={cancelled ? "x" : "check"} size={11} strokeWidth={3} /> : n + 1}
              </span>
              {n < steps.length - 1 && <span className={"w-0.5 grow min-h-[22px] " + (n < currentIdx ? "bg-volt" : "bg-ink/10")} />}
            </div>
            <div className="pb-4">
              <p className={"text-[13px] font-extrabold capitalize " + (done ? "text-ink" : "text-ink/35")}>{s}</p>
              <p className="text-[11px] font-bold text-ink/40">{entry ? dateFmt(entry.at) : done ? "" : "pending"}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function WishlistTab() {
  const { wishlist, dbVersion } = useApp();
  const products = useMemo(() => wishlist.map((id) => catalogService.byId(id)).filter(Boolean), [wishlist, dbVersion]);

  if (products.length === 0) {
    return <EmptyState icon="heart" title="Wishlist is empty" sub="Tap the heart on any device to save it here." action={<Button onClick={() => navigate("/shop")}>Discover devices</Button>} />;
  }
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {products.map((p) => p && <ProductCard key={p.id} product={p} />)}
    </div>
  );
}
