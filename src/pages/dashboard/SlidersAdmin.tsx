import { useMemo, useState } from "react";
import type { Coupon, Slide } from "../../types";
import { useApp } from "../../context/AppContext";
import { commerceService } from "../../services/commerceService";
import { IMG } from "../../lib/seed";
import type { Route } from "../../lib/utils";
import { cx, dateFmt } from "../../lib/utils";
import { Icon } from "../../components/icons";
import { Badge, Button, Confirm, Input, Modal, Select, Toggle } from "../../components/ui";
import { PhoneArt } from "../../components/PhoneArt";

const IMAGE_PRESETS = [
  { label: "Titanium flagship", src: IMG.heroTitanium },
  { label: "Amber glow", src: IMG.heroAmber },
  { label: "Emerald fold", src: IMG.heroFold },
];

/* ------------------------------ sliders ------------------------------ */

interface SlideForm {
  badge: string;
  title: string;
  subtitle: string;
  cta: string;
  link: string;
  mode: "image" | "art";
  image: string;
  from: string;
  to: string;
  body: string;
  screenA: string;
  screenB: string;
  active: boolean;
}

function fromSlide(s: Slide | null): SlideForm {
  return {
    badge: s?.badge ?? "New drop",
    title: s?.title ?? "",
    subtitle: s?.subtitle ?? "",
    cta: s?.cta ?? "Shop now",
    link: s?.link ?? "/shop",
    mode: s?.image ? "image" : "art",
    image: s?.image ?? IMAGE_PRESETS[0].src,
    from: s?.art?.from ?? "#0c1a1e",
    to: s?.art?.to ?? "#1b3a43",
    body: s?.art?.body ?? "#33363d",
    screenA: s?.art?.screenA ?? "#12262e",
    screenB: s?.art?.screenB ?? "#0fa8a0",
    active: s?.active ?? true,
  };
}

export function SlidersAdmin({ route }: { route: Route }) {
  const { user, dbVersion, toast, refresh } = useApp();
  const slides = useMemo(() => commerceService.allSlides(), [dbVersion]);
  const [editing, setEditing] = useState<Slide | "new" | null>(route.query.get("new") === "1" ? "new" : null);
  const [toDelete, setToDelete] = useState<Slide | null>(null);
  const [f, setF] = useState<SlideForm>(() => fromSlide(null));

  const openEditor = (s: Slide | "new") => {
    setF(fromSlide(s === "new" ? null : s));
    setEditing(s);
  };

  const save = () => {
    if (!user) return;
    if (!f.title.trim()) return toast("Slide title is required", "error");
    try {
      commerceService.saveSlide(
        user,
        {
          badge: f.badge,
          title: f.title,
          subtitle: f.subtitle,
          cta: f.cta,
          link: f.link.startsWith("/") ? f.link : "/" + f.link,
          image: f.mode === "image" ? f.image : null,
          art: f.mode === "art" ? { from: f.from, to: f.to, body: f.body, screenA: f.screenA, screenB: f.screenB } : null,
          active: f.active,
        },
        editing && editing !== "new" ? editing.id : undefined
      );
      toast(editing === "new" ? "Slide created" : "Slide updated");
      setEditing(null);
      refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Save failed", "error");
    }
  };

  const previewVisual = { body: f.body, screenA: f.screenA, screenB: f.screenB };

  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <p className="text-sm font-extrabold text-ink/55">
          These slides render — in this exact order — in the storefront hero. Changes go live instantly.
        </p>
        <Button icon="plus" onClick={() => openEditor("new")}>New slide</Button>
      </div>

      <div className="space-y-3">
        {slides.map((s, idx) => (
          <div key={s.id} className={"bg-white border border-linel p-3.5 flex items-center gap-4 " + (s.active ? "" : "opacity-55")}>
            <div className="w-28 h-16 shrink-0 overflow-hidden notch-sm border border-linel">
              {s.image ? (
                <img src={s.image} alt={s.title} className="w-full h-full object-cover" />
              ) : s.art ? (
                <div className="w-full h-full grid place-items-center" style={{ background: `linear-gradient(140deg, ${s.art.from}, ${s.art.to})` }}>
                  <PhoneArt visual={{ body: s.art.body, screenA: s.art.screenA, screenB: s.art.screenB }} className="h-14" showReflection={false} />
                </div>
              ) : null}
            </div>
            <div className="grow min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-d text-[13px] font-bold">#{idx + 1} · {s.title}</span>
                <Badge tone={s.active ? "ok" : "mist"}>{s.active ? "live" : "hidden"}</Badge>
              </div>
              <p className="text-xs font-bold text-ink/45 truncate mt-0.5">{s.subtitle}</p>
              <p className="text-[11px] font-extrabold text-voltd mt-0.5">CTA: {s.cta} → {s.link}</p>
            </div>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => { commerceService.moveSlide(user!, s.id, -1); refresh(); }}
                disabled={idx === 0}
                className="w-8 h-7 grid place-items-center border border-linel text-ink/45 hover:text-voltd hover:border-volt disabled:opacity-25 transition-colors"
                aria-label="Move up"
              >
                <Icon name="chevD" size={13} className="rotate-180" />
              </button>
              <button
                onClick={() => { commerceService.moveSlide(user!, s.id, 1); refresh(); }}
                disabled={idx === slides.length - 1}
                className="w-8 h-7 grid place-items-center border border-linel text-ink/45 hover:text-voltd hover:border-volt disabled:opacity-25 transition-colors"
                aria-label="Move down"
              >
                <Icon name="chevD" size={13} />
              </button>
            </div>
            <Toggle checked={s.active} onChange={() => { commerceService.saveSlide(user!, { ...s, active: !s.active }, s.id); refresh(); toast(s.active ? "Slide hidden" : "Slide live", "info"); }} />
            <div className="flex gap-1">
              <button onClick={() => openEditor(s)} className="w-9 h-9 grid place-items-center border border-linel text-ink/45 hover:text-voltd hover:border-volt transition-colors" aria-label="Edit slide">
                <Icon name="edit" size={15} />
              </button>
              <button onClick={() => setToDelete(s)} className="w-9 h-9 grid place-items-center border border-linel text-ink/45 hover:text-bad hover:border-bad transition-colors" aria-label="Delete slide">
                <Icon name="trash" size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        wide
        title={editing === "new" ? "New hero slide" : "Edit hero slide"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button icon="check" onClick={save}>Save slide</Button>
          </>
        }
      >
        <div className="grid md:grid-cols-[1fr_280px] gap-6">
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3.5">
              <Input label="Badge" value={f.badge} onChange={(e) => setF({ ...f, badge: e.target.value })} placeholder="New arrival" />
              <Input label="CTA label" value={f.cta} onChange={(e) => setF({ ...f, cta: e.target.value })} placeholder="Shop now" />
            </div>
            <Input label="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="iPhone 16 Pro" />
            <Input label="Subtitle" value={f.subtitle} onChange={(e) => setF({ ...f, subtitle: e.target.value })} placeholder="One line that sells it." />
            <Input label="Link (store route)" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="/product/p1" hint="Examples: /shop, /deals, /product/p3" />

            <div>
              <p className="block mb-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink/50">Visual source</p>
              <div className="flex gap-2 mb-3">
                {(["image", "art"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setF({ ...f, mode: m })}
                    className={cx("px-4 py-2 text-sm font-extrabold border-[1.5px] transition-colors", f.mode === m ? "border-volt bg-volt/10 text-voltd" : "border-linel text-ink/50 hover:border-ink/30")}
                  >
                    {m === "image" ? "Photography" : "Generated art"}
                  </button>
                ))}
              </div>
              {f.mode === "image" ? (
                <div className="grid grid-cols-3 gap-2.5">
                  {IMAGE_PRESETS.map((p) => (
                    <button key={p.src} onClick={() => setF({ ...f, image: p.src })} className={"relative overflow-hidden border-2 transition-all " + (f.image === p.src ? "border-volt" : "border-linel hover:border-ink/30")}>
                      <img src={p.src} alt={p.label} className="w-full h-16 object-cover" />
                      <span className="absolute bottom-0 inset-x-0 bg-ink/70 text-paper text-[10px] font-extrabold px-2 py-1 text-left">{p.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {([["from", "BG from"], ["to", "BG to"], ["body", "Body"], ["screenA", "Screen A"], ["screenB", "Screen B"]] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center justify-between gap-2 border border-linel px-3 py-2.5 bg-white">
                      <span className="text-[11px] font-extrabold text-ink/55 uppercase tracking-wide">{label}</span>
                      <input type="color" value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} className="w-9 h-7 cursor-pointer border-0 bg-transparent" aria-label={label} />
                    </label>
                  ))}
                </div>
              )}
              <div className="mt-4">
                <Toggle checked={f.active} onChange={(v) => setF({ ...f, active: v })} label="Visible on storefront" />
              </div>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-ink/45 mb-2.5">Storefront preview</p>
            <div className="relative bg-ink grid-dark overflow-hidden notch h-72">
              <div className="absolute inset-y-0 right-0 w-1/2 overflow-hidden">
                {f.mode === "image" ? (
                  <img src={f.image} alt="" className="w-full h-full object-cover opacity-80" />
                ) : (
                  <div className="w-full h-full grid place-items-center" style={{ background: `linear-gradient(140deg, ${f.from}, ${f.to})` }}>
                    <PhoneArt visual={previewVisual} tilt={8} className="h-[85%]" />
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-transparent" />
              <div className="relative p-5 max-w-[60%]">
                {f.badge && <span className="inline-block bg-volt text-ink text-[9px] font-extrabold uppercase tracking-wide px-2 py-0.5 mb-2.5">{f.badge}</span>}
                <p className="font-d text-lg font-bold text-paper leading-tight">{f.title || "Slide title"}</p>
                <p className="text-[11px] font-semibold text-paper/55 mt-1.5 line-clamp-2">{f.subtitle || "Subtitle shows here."}</p>
                <span className="inline-block mt-3 bg-volt text-ink text-[10px] font-extrabold px-2.5 py-1.5 notch-sm">{f.cta || "Shop now"} →</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <Confirm
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title={"Delete slide " + (toDelete?.title ?? "")}
        body="The slide disappears from the storefront hero immediately."
        onConfirm={() => {
          if (!toDelete || !user) return;
          commerceService.deleteSlide(user, toDelete.id);
          toast("Slide deleted", "info");
          refresh();
        }}
      />
    </div>
  );
}

/* ------------------------------ coupons ------------------------------ */

interface CouponForm {
  code: string;
  kind: "percent" | "fixed";
  value: string;
  minOrder: string;
  expiresAt: string;
  active: boolean;
}

export function CouponsAdmin() {
  const { user, dbVersion, toast, refresh } = useApp();
  const coupons = useMemo(() => commerceService.allCoupons(), [dbVersion]);
  const [editing, setEditing] = useState<Coupon | "new" | null>(null);
  const [toDelete, setToDelete] = useState<Coupon | null>(null);
  const [f, setF] = useState<CouponForm>({ code: "", kind: "percent", value: "10", minOrder: "0", expiresAt: "", active: true });

  const openEditor = (c: Coupon | "new") => {
    if (c === "new") setF({ code: "", kind: "percent", value: "10", minOrder: "0", expiresAt: "", active: true });
    else
      setF({
        code: c.code,
        kind: c.kind,
        value: String(c.value),
        minOrder: String(c.minOrder),
        expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 10) : "",
        active: c.active,
      });
    setEditing(c);
  };

  const save = () => {
    if (!user) return;
    try {
      commerceService.saveCoupon(
        user,
        {
          code: f.code,
          kind: f.kind,
          value: Number(f.value) || 0,
          minOrder: Number(f.minOrder) || 0,
          expiresAt: f.expiresAt ? new Date(f.expiresAt + "T23:59:59").getTime() : null,
          active: f.active,
        },
        editing && editing !== "new" ? editing.id : undefined
      );
      toast(editing === "new" ? "Coupon created" : "Coupon updated");
      setEditing(null);
      refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Save failed", "error");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <p className="text-sm font-extrabold text-ink/55">Coupons are validated and rate-limited at redemption — clients can't fake discounts.</p>
        <Button icon="plus" onClick={() => openEditor("new")}>New coupon</Button>
      </div>

      <div className="bg-white border border-linel overflow-x-auto">
        <table className="tbl w-full min-w-[700px]">
          <thead>
            <tr>
              <th>Code</th>
              <th>Discount</th>
              <th>Min order</th>
              <th>Expires</th>
              <th>Used</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id}>
                <td>
                  <span className="font-d text-[13px] font-bold bg-mist border border-linel px-2.5 py-1 inline-block">{c.code}</span>
                </td>
                <td className="font-bold">{c.kind === "percent" ? c.value + "%" : "$" + c.value}</td>
                <td className="tabular-nums text-ink/60">{c.minOrder ? "$" + c.minOrder : "—"}</td>
                <td className="text-ink/60">{c.expiresAt ? dateFmt(c.expiresAt) : "Never"}</td>
                <td className="tabular-nums text-ink/60">{c.used}×</td>
                <td><Badge tone={c.active ? "ok" : "mist"}>{c.active ? "active" : "off"}</Badge></td>
                <td>
                  <div className="flex justify-end gap-1.5 items-center">
                    <Toggle checked={c.active} onChange={() => { commerceService.toggleCoupon(user!, c.id); refresh(); }} />
                    <button onClick={() => openEditor(c)} className="w-8 h-8 grid place-items-center border border-linel text-ink/40 hover:text-voltd hover:border-volt transition-colors" aria-label="Edit coupon">
                      <Icon name="edit" size={14} />
                    </button>
                    <button onClick={() => setToDelete(c)} className="w-8 h-8 grid place-items-center border border-linel text-ink/40 hover:text-bad hover:border-bad transition-colors" aria-label="Delete coupon">
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "New coupon" : "Edit coupon"}>
        <div className="space-y-4">
          <Input label="Code" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="VOLT10" />
          <div className="grid grid-cols-2 gap-3.5">
            <Select label="Type" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as "percent" | "fixed" })}>
              <option value="percent">Percent off</option>
              <option value="fixed">Fixed $ off</option>
            </Select>
            <Input label={f.kind === "percent" ? "Percent (max 90)" : "Amount ($)"} type="number" min={1} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <Input label="Minimum order ($)" type="number" min={0} value={f.minOrder} onChange={(e) => setF({ ...f, minOrder: e.target.value })} />
            <Input label="Expires (optional)" type="date" value={f.expiresAt} onChange={(e) => setF({ ...f, expiresAt: e.target.value })} />
          </div>
          <Toggle checked={f.active} onChange={(v) => setF({ ...f, active: v })} label="Active immediately" />
          <div className="flex justify-end gap-2.5 pt-1">
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button icon="check" onClick={save}>Save coupon</Button>
          </div>
        </div>
      </Modal>

      <Confirm
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title={"Delete " + (toDelete?.code ?? "")}
        body="The code stops working immediately. Redemption history is lost."
        onConfirm={() => {
          if (!toDelete || !user) return;
          commerceService.deleteCoupon(user, toDelete.id);
          toast("Coupon deleted", "info");
          refresh();
        }}
      />
    </div>
  );
}
