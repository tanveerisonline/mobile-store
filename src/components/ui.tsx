import { useEffect, useState } from "react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cx, money, useCountUp, useReveal } from "../lib/utils";
import { Icon } from "./icons";
import { useApp } from "../context/AppContext";

/* ------------------------------ Reveal ----------------------------- */

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={className} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  );
}

/* ------------------------------ Button ----------------------------- */

type BtnVariant = "primary" | "dark" | "tang" | "outline" | "ghost" | "danger" | "voltline";

const BTN_STYLES: Record<BtnVariant, string> = {
  primary: "bg-volt text-white font-extrabold hover:bg-voltd active:scale-[0.97]",
  dark: "bg-ink text-paper font-bold hover:bg-ink3 active:scale-[0.97]",
  tang: "bg-tang text-white font-extrabold hover:bg-[#e85a1f] active:scale-[0.97]",
  outline: "border-[1.5px] border-ink/25 text-ink font-bold hover:border-ink hover:bg-ink/5 active:scale-[0.97]",
  ghost: "text-ink/70 font-bold hover:bg-ink/5 active:scale-[0.97]",
  danger: "bg-bad text-white font-bold hover:bg-[#b93a3a] active:scale-[0.97]",
  voltline: "border-[1.5px] border-volt/50 text-volt font-bold hover:bg-volt/10 active:scale-[0.97]",
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  loading,
  full,
  notch = true,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  size?: "sm" | "md" | "lg";
  icon?: string;
  iconRight?: string;
  loading?: boolean;
  full?: boolean;
  notch?: boolean;
}) {
  const sizeCls = size === "sm" ? "px-3.5 py-2 text-xs gap-1.5" : size === "lg" ? "px-7 py-3.5 text-[15px] gap-2.5" : "px-5 py-2.5 text-sm gap-2";
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center transition-all duration-200 select-none whitespace-nowrap",
        notch && "notch-sm",
        BTN_STYLES[variant],
        sizeCls,
        full && "w-full",
        (disabled || loading) && "opacity-50 pointer-events-none",
        className
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner size={16} light={variant !== "outline" && variant !== "ghost" && variant !== "voltline"} /> : icon ? <Icon name={icon} size={size === "sm" ? 14 : 17} /> : null}
      {children}
      {iconRight && !loading ? <Icon name={iconRight} size={size === "sm" ? 14 : 17} /> : null}
    </button>
  );
}

export function Spinner({ size = 18, light = true }: { size?: number; light?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className="spin-slow" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke={light ? "rgba(255,255,255,0.35)" : "rgba(12,26,30,0.2)"} strokeWidth="3" />
      <path d="M12 3a9 9 0 0 1 9 9" stroke={light ? "#fff" : "#0b1b33"} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------ Fields ----------------------------- */

export function Field({ label, error, hint, children }: { label?: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-left">
      {label && <span className="block mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink/50">{label}</span>}
      {children}
      {error ? (
        <span className="mt-1.5 flex items-center gap-1 text-xs font-bold text-bad">
          <Icon name="alert" size={12} /> {error}
        </span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs font-semibold text-ink/40">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input({ label, error, hint, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; hint?: string }) {
  return (
    <Field label={label} error={error} hint={hint}>
      <input className={cx("field", error && "!border-bad", className)} {...rest} />
    </Field>
  );
}

export function Select({ label, error, className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string }) {
  return (
    <Field label={label} error={error}>
      <select className={cx("field appearance-none", error && "!border-bad", className)} {...rest}>
        {children}
      </select>
    </Field>
  );
}

export function Textarea({ label, error, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }) {
  return (
    <Field label={label} error={error}>
      <textarea className={cx("field min-h-[96px] resize-y", error && "!border-bad", className)} {...rest} />
    </Field>
  );
}

export function Toggle({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      className={cx("inline-flex items-center gap-2.5 group", disabled && "opacity-40 pointer-events-none")}
      aria-pressed={checked}
    >
      <span className={cx("relative w-10 h-[22px] rounded-full transition-colors duration-200", checked ? "bg-volt" : "bg-ink/20")}>
        <span
          className={cx(
            "absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-all duration-200",
            checked ? "left-[21px]" : "left-[3px]"
          )}
        />
      </span>
      {label && <span className="text-sm font-bold text-ink/70 group-hover:text-ink">{label}</span>}
    </button>
  );
}

export function Stepper({ value, onChange, max = 99, min = 1, small }: { value: number; onChange: (v: number) => void; max?: number; min?: number; small?: boolean }) {
  const btn = cx("grid place-items-center font-extrabold text-ink/60 hover:text-ink hover:bg-volt/15 transition-colors", small ? "w-7 h-7" : "w-9 h-9");
  return (
    <div className={cx("inline-flex items-center border-[1.5px] border-ink/15 bg-white", small ? "h-7" : "h-9")}>
      <button type="button" className={btn} onClick={() => onChange(value - 1)} aria-label="Decrease">
        <Icon name="minus" size={13} />
      </button>
      <span className={cx("text-center font-extrabold tabular-nums", small ? "w-7 text-xs" : "w-10 text-sm")}>{value}</span>
      <button type="button" className={cx(btn, value >= max && "opacity-30 pointer-events-none")} onClick={() => onChange(Math.min(max, value + 1))} aria-label="Increase">
        <Icon name="plus" size={13} />
      </button>
    </div>
  );
}

/* ------------------------------ Badges ----------------------------- */

const TONES: Record<string, string> = {
  volt: "bg-volt/15 text-voltd",
  tang: "bg-tang/12 text-tang",
  gold: "bg-gold/20 text-[#8a6410]",
  ok: "bg-ok/12 text-ok",
  warn: "bg-warn/12 text-warn",
  bad: "bg-bad/12 text-bad",
  mist: "bg-ink/8 text-ink/60",
  ink: "bg-ink text-paper",
};

export function Badge({ tone = "mist", children, className }: { tone?: keyof typeof TONES; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide notch-sm", TONES[tone], className)}>
      {children}
    </span>
  );
}

/* ------------------------------ Modal ------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  wide?: boolean;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-ink/65" onClick={onClose} />
      <div
        className={cx(
          "relative w-full sm:mx-4 bg-paper shadow-2xl sheet-up sm:pop-in flex flex-col max-h-[92dvh]",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg"
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-linel bg-white">
          <h3 className="font-d text-[15px] font-bold text-ink">{title}</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-ink/50 hover:text-ink hover:bg-ink/5 transition-colors" aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5 grow">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-linel bg-white flex flex-wrap gap-2.5 justify-end">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-ink/65" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-paper shadow-2xl slide-in-right flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-linel bg-ink text-paper">
          <h3 className="font-d text-[15px] font-bold">{title}</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-paper/60 hover:text-paper transition-colors" aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="overflow-y-auto grow px-5 py-5">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-linel bg-white">{footer}</div>}
      </div>
    </div>
  );
}

/* --------------------------- Empty / misc --------------------------- */

export function EmptyState({ icon = "box", title, sub, action }: { icon?: string; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-16 h-16 grid place-items-center bg-ink/6 text-ink/40 notch mb-4">
        <Icon name={icon} size={30} strokeWidth={1.5} />
      </div>
      <p className="font-d text-lg font-bold text-ink">{title}</p>
      {sub && <p className="mt-1.5 text-sm font-semibold text-ink/50 max-w-sm">{sub}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionHead({ kicker, title, sub, action, dark }: { kicker: string; title: string; sub?: string; action?: ReactNode; dark?: boolean }) {
  return (
    <Reveal className="flex flex-wrap items-end justify-between gap-4 mb-7">
      <div>
        <p className={cx("flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.22em] mb-2.5", dark ? "text-volt" : "text-voltd")}>
          <Icon name="bolt" size={12} /> {kicker}
        </p>
        <h2 className={cx("font-d text-[22px] sm:text-3xl font-bold leading-tight", dark ? "text-paper" : "text-ink")}>{title}</h2>
        {sub && <p className={cx("mt-2 text-[15px] font-semibold max-w-xl", dark ? "text-paper/55" : "text-ink/55")}>{sub}</p>}
      </div>
      {action}
    </Reveal>
  );
}

export function Price({ value, compareAt, size = "md", dark }: { value: number; compareAt?: number | null; size?: "sm" | "md" | "lg"; dark?: boolean }) {
  const cls = size === "lg" ? "text-[26px] sm:text-3xl" : size === "sm" ? "text-[15px]" : "text-lg";
  return (
    <span className="inline-flex items-baseline gap-2 flex-wrap">
      <span className={cx("font-d font-bold tabular-nums", cls, dark ? "text-paper" : "text-ink")}>{money(value)}</span>
      {compareAt != null && compareAt > value && (
        <>
          <span className={cx("font-bold line-through tabular-nums", size === "lg" ? "text-base" : "text-xs", dark ? "text-paper/40" : "text-ink/35")}>{money(compareAt)}</span>
          <Badge tone="tang">-{Math.round((1 - value / compareAt) * 100)}%</Badge>
        </>
      )}
    </span>
  );
}

export function Stars({ value, size = 13, showValue }: { value: number; size?: number; showValue?: boolean }) {
  const rounded = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name="star" size={size} className={i <= rounded ? "text-gold" : "text-ink/15"} />
      ))}
      {showValue && <span className="ml-1 text-xs font-extrabold text-ink/60 tabular-nums">{value ? value.toFixed(1) : "—"}</span>}
    </span>
  );
}

export function Stat({ label, value, prefix = "", icon, note, tone = "text-paper" }: { label: string; value: number; prefix?: string; icon: string; note?: string; tone?: string }) {
  const { ref, val } = useCountUp(value);
  return (
    <div className="relative overflow-hidden bg-ink2 border border-line p-5 notch card-lift">
      <div className="absolute -right-6 -top-6 w-24 h-24 glow-volt opacity-60" />
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-paper/45">{label}</span>
        <span className="w-8 h-8 grid place-items-center bg-volt/15 text-volt notch-sm">
          <Icon name={icon} size={16} />
        </span>
      </div>
      <p className={cx("font-d text-[26px] font-bold tabular-nums leading-none", tone)}>
        {prefix}
        <span ref={ref}>{val.toLocaleString()}</span>
      </p>
      {note && <p className="mt-2 text-xs font-bold text-paper/40">{note}</p>}
    </div>
  );
}

/* ------------------------------ Confirm ----------------------------- */

export function Confirm({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Delete",
  tone = "danger",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: string;
  confirmLabel?: string;
  tone?: "danger" | "primary";
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm font-semibold text-ink/65 leading-relaxed">{body}</p>
      <div className="mt-6 flex gap-2.5 justify-end">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant={tone}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/* ------------------------------- Tabs ------------------------------- */

export function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: string; icon?: string }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar border-b border-linel mb-6">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cx(
            "flex items-center gap-1.5 px-4 py-2.5 text-sm font-extrabold whitespace-nowrap border-b-2 -mb-px transition-colors",
            active === t.id ? "border-volt text-ink" : "border-transparent text-ink/45 hover:text-ink/75"
          )}
        >
          {t.icon && <Icon name={t.icon} size={15} />}
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------- Toasts ----------------------------- */

export function ToastHost() {
  const { toasts } = useApp();
  return (
    <div className="fixed z-[95] bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-6 flex flex-col gap-2 w-[min(92vw,360px)] pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cx(
            "toast-in pointer-events-auto flex items-center gap-2.5 px-4 py-3 text-sm font-bold shadow-xl notch-sm border",
            t.kind === "success" && "bg-ink text-paper border-volt/40",
            t.kind === "error" && "bg-bad text-white border-transparent",
            t.kind === "info" && "bg-white text-ink border-linel"
          )}
        >
          <Icon name={t.kind === "success" ? "check" : t.kind === "error" ? "alert" : "info"} size={16} className={t.kind === "success" ? "text-volt" : ""} />
          <span className="leading-snug">{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------- Forbidden ---------------------------- */

export function Forbidden({ msg }: { msg?: string }) {
  return (
    <div className="grid place-items-center py-24 px-6 text-center">
      <div className="w-16 h-16 grid place-items-center bg-bad/10 text-bad notch mb-4">
        <Icon name="lock" size={28} />
      </div>
      <p className="font-d text-xl font-bold text-ink">403 — Access denied</p>
      <p className="mt-2 text-sm font-semibold text-ink/55 max-w-md">{msg ?? "Your role doesn't have permission to view this area. The attempt has been written to the audit log."}</p>
    </div>
  );
}

/* ------------------------------ Skeleton ---------------------------- */

export function SkeletonCard() {
  return (
    <div className="bg-white border border-linel p-4">
      <div className="skeleton h-44 mb-4" />
      <div className="skeleton h-3 w-1/3 mb-2" />
      <div className="skeleton h-4 w-3/4 mb-3" />
      <div className="skeleton h-5 w-1/2" />
    </div>
  );
}

/* --------------------------- status helpers -------------------------- */

export const ORDER_TONE: Record<string, keyof typeof TONES> = {
  pending: "warn",
  confirmed: "volt",
  shipped: "gold",
  delivered: "ok",
  cancelled: "bad",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={ORDER_TONE[status] ?? "mist"}>{status}</Badge>;
}

export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}
