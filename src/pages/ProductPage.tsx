import { useMemo, useState } from "react";
import type { Product } from "../types";
import { dealPrice } from "../types";
import { useApp } from "../context/AppContext";
import { catalogService } from "../services/catalogService";
import { commerceService } from "../services/commerceService";
import { cx, dateFmt, money, navigate, useCountdown } from "../lib/utils";
import { Icon } from "../components/icons";
import { Badge, Button, EmptyState, Price, Reveal, Stars, Stepper, Tabs, Textarea } from "../components/ui";
import { PhoneArt } from "../components/PhoneArt";
import { Chip, ProductCard } from "../features/StoreChrome";

export function ProductPage({ id }: { id: string }) {
  const { dbVersion } = useApp();
  const product = useMemo(() => catalogService.byId(id), [id, dbVersion]);

  if (!product || product.status !== "active") {
    return (
      <EmptyState
        icon="phone"
        title="Device not found"
        sub="It may have been retired from the catalog."
        action={<Button variant="dark" onClick={() => navigate("/shop")}>Back to the lineup</Button>}
      />
    );
  }
  return <ProductDetail key={product.id} product={product} />;
}

function ProductDetail({ product }: { product: Product }) {
  const { addToCart, wishlist, toggleWish, setCartOpen, dbVersion } = useApp();
  const [colorIdx, setColorIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState("overview");
  const settings = commerceService.settings();
  void dbVersion;

  const rating = catalogService.ratingFor(product.id);
  const related = catalogService.related(product);
  const category = catalogService.categoryById(product.categoryId);
  const price = dealPrice(product);
  const wished = wishlist.includes(product.id);
  const bodyColor = product.gallery[colorIdx] ?? product.visual.body;
  const visual = { ...product.visual, body: bodyColor };
  const cd = useCountdown(product.deal?.endsAt ?? 0);

  const buyNow = () => {
    addToCart(product.id, qty);
    setCartOpen(false);
    navigate("/checkout");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-extrabold text-ink/40 mb-6 flex-wrap">
        <button onClick={() => navigate("/")} className="hover:text-voltd transition-colors">Home</button>
        <Icon name="chevR" size={12} />
        <button onClick={() => navigate("/shop")} className="hover:text-voltd transition-colors">Shop</button>
        <Icon name="chevR" size={12} />
        {category && (
          <>
            <button onClick={() => navigate(`/shop?cat=${category.id}`)} className="hover:text-voltd transition-colors">{category.name}</button>
            <Icon name="chevR" size={12} />
          </>
        )}
        <span className="text-ink/70 truncate">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-14">
        {/* gallery */}
        <div>
          <Reveal>
            <div className="relative overflow-hidden notch border border-linel grid place-items-center grid-light" style={{ background: `linear-gradient(150deg, ${visual.screenA}20, ${visual.screenB}26), #e8edf5` }}>
              <div className="absolute inset-0 grid-dark opacity-40" style={{ maskImage: "radial-gradient(closest-side, black, transparent)" }} />
              <div className="absolute top-4 left-4 flex flex-col gap-2 items-start z-10">
                {product.deal && <Badge tone="tang">-{product.deal.percent}% flash deal</Badge>}
                {product.stock === 0 && <Badge tone="bad">Sold out</Badge>}
                {product.stock > 0 && product.stock <= settings.lowStockThreshold && <Badge tone="warn">Only {product.stock} left</Badge>}
              </div>
              <PhoneArt key={bodyColor} visual={visual} tilt={-5} className="h-[400px] sm:h-[480px] pop-in" />
            </div>
          </Reveal>
          {product.gallery.length > 1 && (
            <div className="flex gap-2.5 mt-4">
              {product.gallery.map((g, n) => (
                <button
                  key={g + n}
                  onClick={() => setColorIdx(n)}
                  aria-label={`Finish ${n + 1}`}
                  className={cx(
                    "w-14 h-14 border-2 transition-all grid place-items-center",
                    n === colorIdx ? "border-volt scale-105" : "border-linel hover:border-ink/30"
                  )}
                  style={{ background: `linear-gradient(150deg, ${product.visual.screenA}22, ${g}55), #e8edf5` }}
                >
                  <span className="w-6 h-9 rounded-[4px] border border-white/40" style={{ background: g }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* buy panel */}
        <div>
          <Reveal delay={80}>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-voltd mb-2">{product.brand}</p>
            <h1 className="font-d text-[26px] sm:text-4xl font-bold leading-tight">{product.name}</h1>
            <button onClick={() => setTab("reviews")} className="mt-3 flex items-center gap-2 group">
              <Stars value={rating.avg} size={15} />
              <span className="text-sm font-extrabold text-ink/50 group-hover:text-voltd transition-colors">
                {rating.count ? `${rating.avg.toFixed(1)} · ${rating.count} review${rating.count > 1 ? "s" : ""}` : "No reviews yet — be first"}
              </span>
            </button>

            <div className="mt-5">
              <Price value={price} compareAt={product.compareAt ?? (product.deal ? product.price : null)} size="lg" />
            </div>

            {product.deal && !cd.done && (
              <div className="mt-3 inline-flex items-center gap-2 bg-tang/10 border border-tang/30 px-3 py-2 notch-sm">
                <Icon name="clock" size={15} className="text-tang" />
                <span className="text-[13px] font-extrabold text-tang tabular-nums">
                  Deal ends in {cd.d * 24 + cd.h}h {String(cd.m).padStart(2, "0")}m {String(cd.s).padStart(2, "0")}s
                </span>
              </div>
            )}

            <p className="mt-5 text-[15px] font-semibold text-ink/65 leading-relaxed">{product.description}</p>

            <div className="flex flex-wrap gap-1.5 mt-4">
              <Chip>{product.specs.display}</Chip>
              <Chip>{product.specs.chip}</Chip>
              <Chip>{product.specs.ram}</Chip>
              <Chip>{product.specs.storage}</Chip>
              <Chip>{product.specs.battery}</Chip>
              {product.specs.fiveG && <Chip>5G</Chip>}
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-7">
              <Stepper value={qty} onChange={setQty} max={Math.max(1, product.stock)} />
              <Button size="lg" icon="cart" disabled={product.stock === 0} onClick={() => addToCart(product.id, qty)}>
                Add to cart
              </Button>
              <Button size="lg" variant="dark" iconRight="arrowR" disabled={product.stock === 0} onClick={buyNow}>
                Buy now
              </Button>
              <button
                onClick={() => toggleWish(product.id)}
                aria-label="Toggle wishlist"
                className={cx(
                  "w-12 h-12 grid place-items-center border-[1.5px] transition-all active:scale-90",
                  wished ? "border-tang text-tang bg-tang/10" : "border-ink/20 text-ink/45 hover:border-tang hover:text-tang"
                )}
              >
                <Icon name={wished ? "heartFill" : "heart"} size={19} />
              </button>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 mt-8">
              {[
                ["truck", product.price - 0 >= settings.freeShipOver ? "Free express shipping" : `Free shipping over ${money(settings.freeShipOver)}`],
                ["shield", "2-year VOLT warranty"],
                ["rotate", "30-day returns, prepaid"],
              ].map(([icon, label]) => (
                <div key={label} className="flex items-center gap-2.5 bg-white border border-linel px-3 py-3">
                  <Icon name={icon} size={17} className="text-voltd shrink-0" />
                  <span className="text-xs font-extrabold text-ink/65 leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>

      {/* tabs */}
      <div className="mt-14">
        <Tabs
          tabs={[
            { id: "overview", label: "Overview", icon: "info" },
            { id: "specs", label: "Tech specs", icon: "cpu" },
            { id: "reviews", label: `Reviews (${rating.count})`, icon: "star" },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === "overview" && (
          <div className="grid lg:grid-cols-2 gap-10 fade-up">
            <div>
              <h3 className="font-d text-lg font-bold mb-3">Highlights</h3>
              <ul className="space-y-3">
                {product.highlights.map((h) => (
                  <li key={h} className="flex gap-3 items-start">
                    <span className="w-5 h-5 grid place-items-center bg-volt/15 text-voltd shrink-0 mt-0.5">
                      <Icon name="check" size={12} strokeWidth={2.6} />
                    </span>
                    <span className="text-[15px] font-semibold text-ink/70">{h}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-ink text-paper p-7 grid-dark relative overflow-hidden notch">
              <div className="absolute -right-10 -bottom-10 w-56 h-56 glow-volt" />
              <h3 className="font-d text-lg font-bold mb-2 relative">Bench-tested, not box-tested</h3>
              <p className="text-sm font-semibold text-paper/55 leading-relaxed relative">
                Every unit passes a 40-point diagnostic — battery health, display uniformity, modem bands, speaker output and
                thermal behaviour under a 20-minute stress loop — before it earns the VOLT seal.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-6 relative">
                <div><p className="font-d text-2xl font-bold text-volt">40</p><p className="text-xs font-extrabold text-paper/45">point diagnostics</p></div>
                <div><p className="font-d text-2xl font-bold text-volt">≥92%</p><p className="text-xs font-extrabold text-paper/45">battery health guaranteed</p></div>
              </div>
            </div>
          </div>
        )}

        {tab === "specs" && (
          <div className="max-w-2xl fade-up">
            <SpecRow k="Display" v={product.specs.display} />
            <SpecRow k="Chipset" v={product.specs.chip} />
            <SpecRow k="Memory" v={product.specs.ram} />
            <SpecRow k="Storage" v={product.specs.storage} />
            <SpecRow k="Battery" v={product.specs.battery} />
            <SpecRow k="Camera" v={product.specs.camera} />
            <SpecRow k="Software" v={product.specs.os} />
            <SpecRow k="Network" v={product.specs.fiveG ? "5G / 4G LTE" : "4G LTE"} />
            <SpecRow k="Weight" v={product.specs.weight} />
          </div>
        )}

        {tab === "reviews" && <ReviewsPanel product={product} />}
      </div>

      {/* related */}
      {related.length > 0 && (
        <div className="mt-16">
          <Reveal>
            <h2 className="font-d text-xl font-bold mb-5">Pairs well with</h2>
          </Reveal>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SpecRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-6 py-3 border-b border-linel">
      <span className="text-sm font-extrabold text-ink/45">{k}</span>
      <span className="text-sm font-bold text-ink text-right">{v}</span>
    </div>
  );
}

function ReviewsPanel({ product }: { product: Product }) {
  const { user, dbVersion, toast, refresh } = useApp();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  void dbVersion;

  const summary = catalogService.ratingFor(product.id);
  const reviews = catalogService.reviewsFor(product.id);
  const mine = user ? reviews.find((r) => r.userId === user.id) : undefined;

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 400));
      catalogService.addReview(user, product.id, rating, comment);
      setComment("");
      toast(mine ? "Review updated" : "Review published — thanks!");
      refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save review", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-10 fade-up">
      <div>
        <div className="bg-white border border-linel p-6">
          <p className="font-d text-4xl font-bold">{summary.avg ? summary.avg.toFixed(1) : "—"}</p>
          <Stars value={summary.avg} size={16} />
          <p className="text-xs font-extrabold text-ink/45 mt-1.5">{summary.count} verified review{summary.count === 1 ? "" : "s"}</p>
          <div className="mt-4 space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = summary.dist[star - 1];
              const pct = summary.count ? (count / summary.count) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs font-extrabold text-ink/50">
                  <span className="w-3 tabular-nums">{star}</span>
                  <Icon name="star" size={11} className="text-gold" />
                  <div className="h-1.5 grow bg-ink/10 overflow-hidden">
                    <div className="h-full bg-gold transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-4 text-right tabular-nums">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 bg-white border border-linel p-6">
          {user ? (
            <>
              <p className="text-sm font-extrabold mb-3">{mine ? "Update your review" : "Review this device"}</p>
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setRating(n)} aria-label={`${n} stars`} className="transition-transform hover:scale-110 active:scale-95">
                    <Icon name="star" size={24} className={n <= rating ? "text-gold" : "text-ink/15"} />
                  </button>
                ))}
              </div>
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What should buyers know?" />
              <Button className="mt-3" full loading={busy} onClick={submit} icon="send">
                {mine ? "Update review" : "Publish review"}
              </Button>
              <p className="mt-2 text-[11px] font-bold text-ink/40">Rate-limited to 3 reviews / 10 min. Sanitized before storage.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-extrabold mb-1.5">Own this device?</p>
              <p className="text-[13px] font-semibold text-ink/55 mb-4">Sign in to leave a verified review.</p>
              <Button variant="dark" full icon="user" onClick={() => navigate("/auth?next=/product/" + product.id)}>
                Sign in to review
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {reviews.length === 0 && <EmptyState icon="star" title="No reviews yet" sub="Verified buyers will appear here." />}
        {reviews.map((r) => (
          <div key={r.id} className="bg-white border border-linel p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 grid place-items-center bg-ink text-volt text-xs font-extrabold rounded-full">
                  {r.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </span>
                <div>
                  <p className="text-sm font-extrabold">{r.name}</p>
                  <p className="text-[11px] font-bold text-ink/40">{dateFmt(r.createdAt)} · verified purchase</p>
                </div>
              </div>
              <Stars value={r.rating} size={13} />
            </div>
            <p className="mt-3 text-[15px] font-semibold text-ink/70 leading-relaxed">{r.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
