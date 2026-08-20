import { useEffect, useMemo, useState } from "react";
import type { Role, User } from "../../types";
import { useApp } from "../../context/AppContext";
import { authService } from "../../services/authService";
import { commerceService } from "../../services/commerceService";
import { db } from "../../lib/db";
import { logger } from "../../lib/logger";
import { rateLimiter } from "../../lib/security";
import { can, PERMS, ROLE_LABEL, ROLE_TONE } from "../../lib/rbac";
import { cx, dateFmt, dateTimeFmt, timeAgo } from "../../lib/utils";
import { Icon } from "../../components/icons";
import { Badge, Button, Confirm, EmptyState, Input, Modal, Select, Tabs, Toggle } from "../../components/ui";

const ROLES: Role[] = ["admin", "editor", "viewer", "customer"];

/* ------------------------------- users ------------------------------- */

export function UsersAdmin() {
  const { user: me, dbVersion, toast, refresh } = useApp();
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "editor" as Role, password: "" });

  const users = useMemo(() => {
    void dbVersion;
    if (!me) return [];
    try {
      return authService.allUsers(me);
    } catch {
      return [];
    }
  }, [me, dbVersion]);

  if (!me) return null;

  const act = (fn: () => void) => {
    try {
      fn();
      refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Action failed", "error");
    }
  };

  const generatePw = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let pw = "Vt!" + Math.floor(Math.random() * 90 + 10);
    for (let i = 0; i < 8; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    setForm((f) => ({ ...f, password: pw }));
  };

  const createUser = () => {
    act(() => {
      authService.createUser(me, form);
      toast(`Invitation record created for ${form.email}`);
      setCreating(false);
      setForm({ name: "", email: "", role: "editor", password: "" });
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <p className="text-sm font-extrabold text-ink/55">
          Role changes are enforced in the service layer and written to the audit log.
        </p>
        <Button icon="plus" onClick={() => setCreating(true)}>Add user</Button>
      </div>

      <div className="bg-white border border-linel overflow-x-auto">
        <table className="tbl w-full min-w-[780px]">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Last login</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={u.status === "suspended" ? "opacity-55" : ""}>
                <td>
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 grid place-items-center bg-ink text-volt text-xs font-extrabold rounded-full shrink-0">
                      {u.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                    </span>
                    <div className="min-w-0">
                      <p className="font-extrabold text-[13px] truncate">
                        {u.name} {u.id === me.id && <span className="text-voltd">(you)</span>}
                      </p>
                      <p className="text-[11px] font-bold text-ink/40 truncate">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <select
                    value={u.role}
                    disabled={u.id === me.id}
                    onChange={(e) =>
                      act(() => {
                        authService.setRole(me, u.id, e.target.value as Role);
                        toast(`${u.email} is now ${ROLE_LABEL[e.target.value as Role]}`);
                      })
                    }
                    className="field !w-auto !py-1.5 text-[13px] cursor-pointer disabled:opacity-50"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <Badge tone={u.status === "active" ? "ok" : "bad"}>{u.status}</Badge>
                    {u.id !== me.id && (
                      <Toggle
                        checked={u.status === "active"}
                        onChange={(v) =>
                          act(() => {
                            authService.setStatus(me, u.id, v ? "active" : "suspended");
                            toast(v ? "User reactivated" : "User suspended — sessions revoked", "info");
                          })
                        }
                      />
                    )}
                  </div>
                </td>
                <td className="text-ink/60 whitespace-nowrap">{dateFmt(u.createdAt)}</td>
                <td className="text-ink/60 whitespace-nowrap">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : "never"}</td>
                <td>
                  <div className="flex justify-end">
                    <button
                      onClick={() => setToDelete(u)}
                      disabled={u.id === me.id}
                      className="w-8 h-8 grid place-items-center border border-linel text-ink/40 hover:text-bad hover:border-bad transition-colors disabled:opacity-25"
                      aria-label="Delete user"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="Add user">
        <div className="space-y-4">
          <Input label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Riley Ohm" />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="riley@volt.store" />
          <div className="grid grid-cols-2 gap-3.5 items-end">
            <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </Select>
            <div>
              <p className="block mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink/50">Temp password</p>
              <div className="flex gap-2">
                <input value={form.password} readOnly className="field !py-2 text-sm font-bold" placeholder="generate →" />
                <Button variant="outline" size="sm" onClick={generatePw} icon="zap">Gen</Button>
              </div>
            </div>
          </div>
          <div className="bg-mist border border-linel p-3 text-[11px] font-bold text-ink/50 leading-relaxed">
            <Icon name="shield" size={12} className="inline mr-1 text-voltd" />
            Passwords are PBKDF2-hashed (120k iterations, per-user salt) before storage. Plaintext never persists.
          </div>
          <div className="flex justify-end gap-2.5">
            <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
            <Button icon="check" onClick={createUser}>Create user</Button>
          </div>
        </div>
      </Modal>

      <Confirm
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title={"Delete " + (toDelete?.name ?? "")}
        body="The account, its sessions and role are removed. Their order history stays for accounting."
        onConfirm={() => {
          if (!toDelete) return;
          act(() => {
            authService.deleteUser(me, toDelete.id);
            toast("User deleted", "info");
          });
        }}
      />
    </div>
  );
}

/* ------------------------- security & audit -------------------------- */

export function SecurityAdmin() {
  const { user: me, dbVersion, toast, refresh } = useApp();
  const [tab, setTab] = useState("audit");
  const [level, setLevel] = useState<string>("all");
  const [q, setQ] = useState("");
  const [, force] = useState(0);

  useEffect(() => logger.subscribe(() => force((v) => v + 1)), []);

  const entries = useMemo(() => {
    let list = logger.list();
    if (level !== "all") list = list.filter((e) => e.level === level);
    const query = q.trim().toLowerCase();
    if (query) list = list.filter((e) => (e.action + " " + e.actor + " " + e.detail).toLowerCase().includes(query));
    return list;
  }, [level, q, dbVersion]);

  const sessions = useMemo(() => {
    void dbVersion;
    if (!me || !can(me.role, PERMS.USERS)) return [];
    try {
      return authService.listSessions(me);
    } catch {
      return [];
    }
  }, [me, dbVersion]);

  const [, tick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => tick((v) => v + 1), 1000);
    return () => window.clearInterval(t);
  }, []);
  const buckets = rateLimiter.snapshot();

  if (!me) return null;

  const LEVEL_CLS: Record<string, string> = {
    DEBUG: "bg-ink/8 text-ink/55",
    INFO: "bg-volt/15 text-voltd",
    WARN: "bg-warn/12 text-warn",
    SECURITY: "bg-bad/12 text-bad",
  };

  return (
    <div>
      <Tabs
        tabs={[
          { id: "audit", label: "Audit log", icon: "activity" },
          ...(can(me.role, PERMS.USERS) ? [{ id: "sessions", label: "Sessions", icon: "key" }] : []),
          { id: "limits", label: "Rate limiter", icon: "clock" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "audit" && (
        <div>
          <div className="flex flex-wrap gap-2 mb-4 items-center">
            {["all", "SECURITY", "WARN", "INFO", "DEBUG"].map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={cx(
                  "px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide border transition-colors",
                  level === l ? "bg-ink text-paper border-ink" : "bg-white border-linel text-ink/50 hover:border-ink/30"
                )}
              >
                {l}
              </button>
            ))}
            <div className="flex items-center bg-white border border-linel focus-within:border-volt transition-colors ml-auto w-52">
              <Icon name="search" size={14} className="ml-2.5 text-ink/35" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter entries..." className="bg-transparent px-2 py-2 text-[13px] font-semibold w-full outline-none" />
            </div>
            {can(me.role, PERMS.USERS) && (
              <Button variant="outline" size="sm" icon="trash" onClick={() => { logger.clear(me.email); toast("Audit log cleared", "info"); refresh(); }}>
                Clear
              </Button>
            )}
          </div>
          <div className="bg-white border border-linel max-h-[540px] overflow-y-auto">
            {entries.length === 0 ? (
              <EmptyState icon="activity" title="No log entries" sub="Actions across the store will appear here." />
            ) : (
              entries.map((e) => (
                <div key={e.id} className="flex items-start gap-3 px-4 py-2.5 border-b border-linel last:border-0 hover:bg-mist/50 transition-colors">
                  <span className={cx("shrink-0 px-2 py-0.5 text-[10px] font-extrabold tracking-wide mt-0.5", LEVEL_CLS[e.level])}>{e.level}</span>
                  <div className="grow min-w-0">
                    <p className="text-[13px] font-extrabold">
                      {e.action} <span className="text-ink/35 font-bold">· {e.actor}</span>
                    </p>
                    {e.detail && <p className="text-xs font-semibold text-ink/45 truncate">{e.detail}</p>}
                  </div>
                  <span className="text-[11px] font-bold text-ink/35 whitespace-nowrap tabular-nums">{dateTimeFmt(e.at)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "sessions" && (
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <p className="text-sm font-extrabold text-ink/55">Sessions expire 24h after issue. Revoking kills the token immediately.</p>
            <Button variant="danger" size="sm" icon="x" onClick={() => { authService.revokeAllSessions(me); toast("All sessions revoked", "info"); refresh(); }}>
              Revoke all
            </Button>
          </div>
          <div className="bg-white border border-linel">
            {sessions.length === 0 && <EmptyState icon="key" title="No active sessions" />}
            {sessions.map(({ session, user }) => (
              <div key={session.token} className="flex items-center gap-3 px-4 py-3 border-b border-linel last:border-0">
                <Icon name="key" size={16} className="text-voltd shrink-0" />
                <div className="grow min-w-0">
                  <p className="text-[13px] font-extrabold truncate">{user?.name ?? "Unknown user"} <span className="text-ink/35 font-bold">· {session.device}</span></p>
                  <p className="text-[11px] font-bold text-ink/40 truncate">
                    token {session.token.slice(0, 14)}… · issued {timeAgo(session.createdAt)} · expires {timeAgo(session.expiresAt).replace("ago", "from now")}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { authService.revokeSession(me, session.token); toast("Session revoked", "info"); refresh(); }}>
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "limits" && (
        <div>
          <div className="grid sm:grid-cols-3 gap-3 mb-5">
            {[
              ["login:{email}", "5 / 10 min", "Brute-force protection on sign-in"],
              ["register:{email}", "3 / 10 min", "Signup spam protection"],
              ["review:{user}", "3 / 10 min", "Review flooding protection"],
              ["coupon:global", "10 / min", "Coupon brute-force protection"],
              ["news:{email}", "3 / hour", "Newsletter abuse protection"],
              ["checkout", "revalidated", "Totals recomputed server-side"],
            ].map(([k, v, d]) => (
              <div key={k} className="bg-white border border-linel p-4">
                <p className="font-d text-[12px] font-bold text-voltd">{k}</p>
                <p className="text-sm font-extrabold mt-1">{v}</p>
                <p className="text-[11px] font-bold text-ink/45 mt-0.5">{d}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <p className="text-sm font-extrabold text-ink/55">Active buckets right now: {buckets.length}</p>
            <Button variant="outline" size="sm" icon="rotate" onClick={() => { rateLimiter.resetAll(); toast("Rate limiter reset", "info"); forceTick(); }}>
              Reset limiter
            </Button>
          </div>
          <div className="bg-white border border-linel">
            {buckets.length === 0 ? (
              <EmptyState icon="clock" title="No active buckets" sub="Limits engage when auth or redemption traffic spikes." />
            ) : (
              buckets.map((b) => (
                <div key={b.key} className="flex items-center gap-3 px-4 py-3 border-b border-linel last:border-0">
                  <span className="font-d text-[12px] font-bold text-ink w-52 truncate">{b.key}</span>
                  <Badge tone={b.count >= 4 ? "warn" : "mist"}>{b.count} hits</Badge>
                  <span className="ml-auto text-xs font-bold text-ink/45 tabular-nums">resets in {Math.max(0, Math.ceil((b.reset - Date.now()) / 1000))}s</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );

  function forceTick() {
    force((v) => v + 1);
  }
}

/* ------------------------------ settings ----------------------------- */

const PRISMA_SCHEMA = `// schema.prisma — production target (Postgres)
model User {
  id         String    @id @default(cuid())
  email      String    @unique
  passHash   String
  salt       String
  role       Role      @default(CUSTOMER)
  status     Status    @default(ACTIVE)
  sessions   Session[]
  orders     Order[]
  reviews    Review[]
}
model Session { token String @id; userId String; expiresAt DateTime }
model Product { id String @id; slug String @unique; price Int; stock Int; ... }
model Order   { id String @id; items Json; total Int; status OrderStatus }
model Slide   { id String @id; order Int; active Boolean }
model Coupon  { code String @unique; kind Kind; value Int }
enum Role { ADMIN EDITOR VIEWER CUSTOMER }`;

export function SettingsAdmin() {
  const { user: me, dbVersion, toast, refresh } = useApp();
  const settings = useMemo(() => commerceService.settings(), [dbVersion]);
  const [f, setF] = useState({ ...settings });
  const [resetOpen, setResetOpen] = useState(false);
  const canEdit = can(me?.role, PERMS.SETTINGS);

  useEffect(() => setF({ ...settings }), [settings]);

  if (!me) return null;

  const stats = db.tableStats();

  const save = () => {
    try {
      commerceService.saveSettings(me, {
        storeName: f.storeName,
        tagline: f.tagline,
        announcement: f.announcement,
        shippingFee: Math.max(0, Number(f.shippingFee) || 0),
        freeShipOver: Math.max(0, Number(f.freeShipOver) || 0),
        lowStockThreshold: Math.max(0, Math.round(Number(f.lowStockThreshold) || 0)),
      });
      toast("Settings saved — storefront updated");
      refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Save failed", "error");
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-5 items-start">
      <div className="space-y-5">
        <div className="bg-white border border-linel p-6">
          <p className="font-d text-[15px] font-bold mb-4">Storefront</p>
          <div className="space-y-4">
            <Input label="Store name" value={f.storeName} onChange={(e) => setF({ ...f, storeName: e.target.value })} disabled={!canEdit} />
            <Input label="Tagline" value={f.tagline} onChange={(e) => setF({ ...f, tagline: e.target.value })} disabled={!canEdit} />
            <Input label="Announcement bar" value={f.announcement} onChange={(e) => setF({ ...f, announcement: e.target.value })} disabled={!canEdit} />
            <div className="grid grid-cols-3 gap-3">
              <Input label="Ship fee ($)" type="number" min={0} value={String(f.shippingFee)} onChange={(e) => setF({ ...f, shippingFee: Number(e.target.value) })} disabled={!canEdit} />
              <Input label="Free over ($)" type="number" min={0} value={String(f.freeShipOver)} onChange={(e) => setF({ ...f, freeShipOver: Number(e.target.value) })} disabled={!canEdit} />
              <Input label="Low stock ≤" type="number" min={0} value={String(f.lowStockThreshold)} onChange={(e) => setF({ ...f, lowStockThreshold: Number(e.target.value) })} disabled={!canEdit} />
            </div>
          </div>
          {canEdit && (
            <Button className="mt-5" icon="check" onClick={save}>Save settings</Button>
          )}
        </div>

        <div className="bg-white border border-linel p-6">
          <p className="font-d text-[15px] font-bold mb-1">Database</p>
          <p className="text-xs font-bold text-ink/45 mb-4">
            Embedded store mirrors this Prisma schema 1:1 — swap the repository layer for <span className="text-voltd">@prisma/client</span> to go to Postgres.
          </p>
          <div className="space-y-1.5 mb-5">
            {stats.map((t) => (
              <div key={t.table} className="flex items-center gap-3 text-[13px] font-bold">
                <Icon name="db" size={14} className="text-voltd" />
                <span className="font-d text-[12px] w-28">{t.table}</span>
                <span className="text-ink/45">{t.rows} rows</span>
                <span className="ml-auto text-ink/35 tabular-nums">{(t.bytes / 1024).toFixed(1)} KB</span>
              </div>
            ))}
          </div>
          <pre className="bg-ink text-voltl text-[10.5px] leading-relaxed font-bold p-4 overflow-x-auto notch-sm max-h-64 overflow-y-auto">{PRISMA_SCHEMA}</pre>
        </div>
      </div>

      <div className="space-y-5">
        <div className="bg-ink text-paper p-6 grid-dark relative overflow-hidden notch">
          <div className="absolute -right-12 -top-16 w-56 h-56 glow-volt" />
          <p className="font-d text-[15px] font-bold mb-3 relative flex items-center gap-2">
            <Icon name="shield" size={16} className="text-volt" /> Security posture
          </p>
          <ul className="space-y-2.5 relative">
            {[
              "PBKDF2-SHA256 · 120,000 iterations · per-user salt",
              "Crypto-random 256-bit session tokens · 24h expiry",
              "RBAC matrix enforced in services, not just UI",
              "Sliding-window rate limits on all auth endpoints",
              "Input sanitization — tags stripped before storage",
              "Order totals recomputed server-side at checkout",
              "Full audit trail — no external telemetry (no Sentry)",
            ].map((s) => (
              <li key={s} className="flex gap-2.5 text-[13px] font-bold text-paper/70">
                <Icon name="check" size={14} className="text-volt shrink-0 mt-0.5" /> {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white border border-bad/30 p-6">
          <p className="font-d text-[15px] font-bold text-bad mb-1">Danger zone</p>
          <p className="text-[13px] font-semibold text-ink/55 mb-4">
            Reset the demo database back to its seed: products, orders, users, sliders, audit trail and sessions.
          </p>
          {can(me.role, PERMS.SETTINGS) ? (
            <Button variant="danger" icon="rotate" onClick={() => setResetOpen(true)}>Reset demo data</Button>
          ) : (
            <p className="text-xs font-bold text-ink/40">Requires settings.manage permission.</p>
          )}
        </div>
      </div>

      <Confirm
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset all demo data?"
        body="Everything — products, orders, users, sessions, coupons, slides and the audit log — returns to the original seed. The page will reload."
        confirmLabel="Wipe & reseed"
        onConfirm={() => {
          ["volt_db_v1", "volt_audit_v1", "volt_rl_v1", "volt_cart_v1", "volt_wish_v1", "volt_session_token"].forEach((k) => localStorage.removeItem(k));
          window.location.hash = "/";
          window.location.reload();
        }}
      />
    </div>
  );
}
