import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Slide } from "../types";
import { dealPrice } from "../types";
import { useApp } from "../context/AppContext";
import { catalogService } from "../services/catalogService";
import { commerceService } from "../services/commerceService";
import { IMG } from "../lib/seed";
import { cx, money, navigate, useCountdown } from "../lib/utils";
import { Icon } from "../components/icons";
import { Badge, Button, Reveal, SectionHead, SkeletonCard } from "../components/ui";
import { PhoneArt } from "../components/PhoneArt";
import { ProductCard } from "../features/StoreChrome";

/* ------------------------------ hero slider -------------------------- */

function HeroSlider() {
  const { dbVersion } = useApp();
  void dbVersion;
  const slides = useMemo(() => commerceService.activeSlides(), [dbVersion]);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const idx = slides.length ? ((i % slides.length) + slides.length) % slides.length : 0;

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const t = window.setTimeout(() => setI((v) => v + 1), 6000);
    return () => window.clearTimeout(t);
  }, [idx, paused, slides.length]);

  if (!slides.length) {
    return (
      <section className="bg-ink text-paper grid-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-24 text-center">
          <p className="font-d text-3xl font-bold">The lineup is being restocked ⚡</p>
        </div>
      </section>
    );
  }

  const slide = slides[idx];
  const go = (dir: number) => setI((v) => (v + dir + slides.length) % slides.length);

  return (
    <section
      className="relative bg-ink text-paper overflow-hidden grid-dark"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <div className="absolute -top-32 -right-32 w-[480px] h-[480px] glow-volt opacity-70 pointer-events-none" />
      <div className="absolute -bottom-40 -left-24 w-[420px] h-[420px] glow-tang opacity-40 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 items-center gap-8 lg:gap-12 py-12 lg:py-16 min-h-[520px]">
        <div key={idx} className="fade-up max-w-xl">
          <Badge tone="volt" className="mb-5">{slide.badge || "Featured"}</Badge>
          <h1 className="font-d text-[32px] sm:text-5xl xl:text-[56px] font-bold leading-[1.05] tracking-tight">{slide.title}</h1>
          <p className="mt-5 text-[15px] sm:text-lg font-semibold text-paper/60 leading-relaxed">{slide.subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" iconRight="arrowR" onClick={() => navigate(slide.link || "/shop")}>
              {slide.cta || "Shop now"}
            </Button>
            <Button size="lg" variant="outline" className="!border-paper/25 !text-paper hover:!border-volt hover:!text-volt" onClick={() => navigate("/shop")}>
              Browse all phones
            </Button>
          </div>
          <div className="mt-10 flex items-center gap-5">
            <div className="flex gap-2">
              {slides.map((s, n) => (
                <button
                  key={s.id}
                  onClick={() => setI(n)}
                  aria-label={`Slide ${n + 1}`}
                  className={cx("h-[5px] transition-all duration-300", n === idx ? "w-9 bg-volt" : "w-5 bg-paper/20 hover:bg-paper/40")}
                />
              ))}
            </div>
            <span className="font-d text-xs font-bold text-paper/35 tabular-nums">
              0{idx + 1} / 0{slides.length}
            </span>
          </div>
        </div>

        <div key={`art${idx}`} className="relative h-[280px] sm:h-[400px] lg:h-[460px] fade-up">
          {slide.image ? (
            <div className="absolute inset-0 overflow-hidden notch">
              <img src={slide.image} alt={slide.title} className="w-full h-full object-cover kenburns" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent" />
            </div>
          ) : slide.art ? (
            <div className="absolute inset-0 grid place-items-center notch" style={{ background: `linear-gradient(140deg, ${slide.art.from}, ${slide.art.to})` }}>
              <PhoneArt visual={{ body: slide.art.body, screenA: slide.art.screenA, screenB: slide.art.screenB }} float tilt={8} className="h-[92%]" />
            </div>
          ) : null}
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pb-8 flex items-center justify-between">
        <div className="h-[3px] w-40 bg-paper/10 overflow-hidden hidden sm:block">
          <div key={`p${idx}${paused}`} className={cx("h-full bg-volt", !paused && "progress-run")} style={{ animationDuration: "6s", width: paused ? "100%" : undefined }} />
        </div>
        <div className="flex gap-2 ml-auto">
          <button onClick={() => go(-1)} className="w-10 h-10 grid place-items-center border border-line text-paper/60 hover:text-volt hover:border-volt transition-colors notch-sm" aria-label="Previous slide">
            <Icon name="chevL" size={18} />
          </button>
          <button onClick={() => go(1)} className="w-10 h-10 grid place-items-center border border-line text-paper/60 hover:text-volt hover:border-volt transition-colors notch-sm" aria-label="Next slide">
            <Icon name="chevR" size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ sections ----------------------------- */

function TrustStrip() {
  const settings = commerceService.settings();
  const items: [string, string][] = [
    ["truck", `Free express shipping over ${money(settings.freeShipOver)}`],
    ["shield", "2-year warranty on every device"],
    ["rotate", "30-day no-questions returns"],
    ["lock", "Encrypted, rate-limited checkout"],
  ];
  return (
    <div className="bg-white border-b border-linel">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 lg:grid-cols-4">
        {items.map(([icon, label], n) => (
          <div key={label} className={cx("flex items-center gap-3 py-4 pr-4", n > 0 && "lg:border-l lg:border-linel lg:pl-6")}>
            <span className="w-9 h-9 shrink-0 grid place-items-center bg-volt/12 text-voltd notch-sm">
              <Icon name={icon} size={17} />
            </span>
            <span className="text-[13px] font-extrabold text-ink/70 leading-tight">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BrandMarquee() {
  const brands = catalogService.brands();
  const loop = [...brands, ...brands];
  return (
    <div className="bg-ink2 border-y border-line py-4 overflow-hidden">
      <div className="marquee flex w-max items-center gap-12">
        {loop.map((b, n) => (
          <span key={`${b}${n}`} className="flex items-center gap-12">
            <span className="font-d text-lg font-bold uppercase tracking-[0.2em] text-paper/25 hover:text-volt transition-colors cursor-default">{b}</span>
            <Icon name="bolt" size={14} className="text-volt/40" />
          </span>
        ))}
      </div>
    </div>
  );
}

function CategoryRow() {
  const { dbVersion } = useApp();
  void dbVersion;
  const cats = catalogService.categories();
  const products = catalogService.storeProducts();
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-16">
      <SectionHead
        kicker="Browse by need"
        title="Find your next handset"
        action={<Button variant="outline" size="sm" iconRight="arrowR" onClick={() => navigate("/shop")}>All devices</Button>}
      />
      <Reveal>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {cats.map((c) => {
            const count = products.filter((p) => p.categoryId === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => navigate(`/shop?cat=${c.id}`)}
                className="group min-w-[168px] bg-white border border-linel p-5 text-left card-lift hover:border-volt transition-colors"
              >
                <span className="w-11 h-11 grid place-items-center bg-ink text-voltl notch-sm mb-4 group-hover:bg-volt group-hover:text-white transition-colors">
                  <Icon name={c.icon} size={20} />
                </span>
                <p className="font-d text-[15px] font-bold">{c.name}</p>
                <p className="text-xs font-bold text-ink/45 mt-1">{c.blurb}</p>
                <p className="mt-3 text-[11px] font-extrabold uppercase tracking-wider text-voltd">{count} device{count === 1 ? "" : "s"} →</p>
              </button>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}

function CountdownBox({ v, label }: { v: number; label: string }) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 grid place-items-center bg-ink2 border border-line font-d text-lg font-bold text-volt tabular-nums notch-sm">
        {String(v).padStart(2, "0")}
      </div>
      <span className="block mt-1.5 text-[10px] font-extrabold uppercase tracking-widest text-paper/40">{label}</span>
    </div>
  );
}

function FlashDeals() {
  const { dbVersion, addToCart } = useApp();
  void dbVersion;
  const products = catalogService.storeProducts();
  const deals = products.filter((p) => p.deal && p.deal.endsAt > Date.now());
  const endsAt = deals.length ? Math.min(...deals.map((p) => p.deal!.endsAt)) : Date.now();
  const cd = useCountdown(endsAt);

  if (!deals.length) return null;
  return (
    <section className="relative bg-ink text-paper mt-16 py-16 grid-dark overflow-hidden">
      <div className="absolute top-0 right-0 w-[420px] h-[420px] glow-tang opacity-50 pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-8">
          <SectionHead
            dark
            kicker="Limited stock · live prices"
            title="Gone in a flash"
            sub="Deal pricing is recomputed at checkout and stock is reserved the moment you pay."
          />
          <div className="flex gap-2.5 mb-7">
            <CountdownBox v={cd.d * 24 + cd.h} label="hrs" />
            <CountdownBox v={cd.m} label="min" />
            <CountdownBox v={cd.s} label="sec" />
          </div>
        </div>
        <div className="flex gap-5 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {deals.map((p, n) => {
            const claimed = Math.round((p.sold / (p.sold + p.stock)) * 100);
            return (
              <Reveal key={p.id} delay={n * 70} className="w-[248px] shrink-0">
                <div className="bg-ink2 border border-line h-full flex flex-col card-lift cursor-pointer" onClick={() => navigate(`/product/${p.id}`)}>
                  <div className="relative m-3 mb-0">
                    <div className="bg-paper notch-sm overflow-hidden">
                      <div className="p-2">
                        <PhoneArt visual={p.visual} tilt={-5} className="h-36 mx-auto" showReflection={false} />
                      </div>
                    </div>
                    <Badge tone="tang" className="absolute top-2 left-2">-{p.deal!.percent}%</Badge>
                  </div>
                  <div className="p-4 flex flex-col grow">
                    <p className="text-sm font-extrabold leading-snug">{p.name}</p>
                    <p className="text-[11px] font-bold text-paper/40 mt-0.5">{p.specs.ram} · {p.specs.storage}</p>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="font-d text-lg font-bold text-volt tabular-nums">{money(dealPrice(p))}</span>
                      <span className="text-xs font-bold text-paper/35 line-through tabular-nums">{money(p.price)}</span>
                    </div>
                    <div className="mt-3">
                      <div className="h-1.5 bg-paper/10 overflow-hidden">
                        <div className="h-full bg-tang transition-all duration-700" style={{ width: `${claimed}%` }} />
                      </div>
                      <p className="mt-1.5 text-[11px] font-extrabold text-paper/45">{claimed}% claimed</p>
                    </div>
                    <Button size="sm" variant="tang" className="mt-4" icon="cart" onClick={(e) => { e.stopPropagation(); addToCart(p.id); }}>
                      Grab deal
                    </Button>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FeaturedGrid() {
  const { dbVersion } = useApp();
  void dbVersion;
  const featured = catalogService.storeProducts().filter((p) => p.featured).slice(0, 8);
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-16">
      <SectionHead
        kicker="This week's heat"
        title="Featured devices"
        sub="Hand-picked flagships and crowd favourites, bench-tested before dispatch."
        action={<Button variant="outline" size="sm" iconRight="arrowR" onClick={() => navigate("/shop")}>View all</Button>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {featured.map((p, n) => (
          <Reveal key={p.id} delay={(n % 4) * 70}>
            <ProductCard product={p} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function SplitBanner() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 grid lg:grid-cols-5 gap-5">
      <Reveal className="lg:col-span-3">
        <div className="group relative overflow-hidden notch min-h-[340px] h-full cursor-pointer" onClick={() => navigate("/shop?cat=c6")}>
          <img src={IMG.tradeIn} alt="Trade in your old phone" className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2500ms] ease-out group-hover:scale-110" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/35 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-7 sm:p-9 text-paper">
            <Badge tone="tang" className="mb-3">Trade-in program</Badge>
            <p className="font-d text-2xl sm:text-[32px] font-bold leading-tight max-w-md">Your old phone is worth up to $180 credit.</p>
            <p className="mt-2 text-sm font-semibold text-paper/65 max-w-md">Instant quote at checkout — we recycle what we can't reuse.</p>
            <div className="mt-5">
              <Button variant="tang" iconRight="arrowR">Value my device</Button>
            </div>
          </div>
        </div>
      </Reveal>
      <Reveal delay={100} className="lg:col-span-2">
        <div className="relative bg-ink text-paper p-7 sm:p-9 h-full grid-dark overflow-hidden notch">
          <div className="absolute -top-16 -right-16 w-56 h-56 glow-volt" />
          <p className="font-d text-xl font-bold mb-1">Why buy from VOLT</p>
          <p className="text-sm font-semibold text-paper/50 mb-5">Four promises, audited every quarter.</p>
          {[
            ["cpu", "Bench-tested", "40-point diagnostics on every unit before it ships."],
            ["shield", "Insured door-to-door", "Lost in transit? Replaced, no forms, no fuss."],
            ["cash", "Price-match promise", "Found it cheaper within 7 days? We refund the gap."],
            ["rotate", "Instant returns", "Prepaid label in the box. Refunds land in 48h."],
          ].map(([icon, title, sub]) => (
            <div key={title} className="flex gap-3.5 py-3.5 border-t border-line first:border-0">
              <span className="w-9 h-9 shrink-0 grid place-items-center bg-volt/15 text-volt notch-sm">
                <Icon name={icon} size={17} />
              </span>
              <div>
                <p className="text-sm font-extrabold">{title}</p>
                <p className="text-xs font-semibold text-paper/45 leading-relaxed">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

function NewArrivals() {
  const { dbVersion } = useApp();
  void dbVersion;
  const latest = [...catalogService.storeProducts()].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4);
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-16">
      <SectionHead
        kicker="Fresh off the line"
        title="New arrivals"
        action={<Button variant="outline" size="sm" iconRight="arrowR" onClick={() => navigate("/shop?sort=newest")}>Latest drops</Button>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {latest.map((p, n) => (
          <Reveal key={p.id} delay={n * 70}>
            <ProductCard product={p} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Newsletter() {
  const { toast, dbVersion } = useApp();
  void dbVersion;
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      commerceService.subscribeNewsletter(email);
      setDone(true);
      toast("You're on the list — first dibs secured ⚡");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not subscribe", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-16">
      <Reveal>
        <div className="relative overflow-hidden bg-volt text-white notch p-8 sm:p-12 grid md:grid-cols-2 gap-8 items-center">
          <div className="absolute inset-0 grid-dark opacity-60" />
          <div className="relative">
            <p className="font-d text-2xl sm:text-3xl font-bold leading-tight">First dibs on every drop.</p>
            <p className="mt-2 text-[15px] font-bold text-white/70">One email per launch. No spam — rate-limited like everything else here.</p>
          </div>
          {done ? (
            <div className="relative flex items-center gap-3 bg-ink text-paper px-5 py-4 notch-sm">
              <Icon name="check" size={20} className="text-voltl" />
              <p className="text-sm font-extrabold">Subscribed. Watch your inbox for the next drop.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="relative flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@future.mail"
                className="field !py-3.5 grow"
              />
              <Button type="submit" variant="dark" size="lg" loading={busy} iconRight="send">
                Notify me
              </Button>
            </form>
          )}
        </div>
      </Reveal>
    </section>
  );
}

export function HomePage() {
  const { dbVersion } = useApp();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 450);
    return () => window.clearTimeout(t);
  }, []);
  void dbVersion;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="skeleton h-[380px] mb-8" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((n) => (
            <SkeletonCard key={n} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <HeroSlider />
      <TrustStrip />
      <BrandMarquee />
      <CategoryRow />
      <FlashDeals />
      <FeaturedGrid />
      <SplitBanner />
      <NewArrivals />
      <Newsletter />
    </div>
  );
}

export type { Slide };
