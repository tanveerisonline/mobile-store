import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useApp } from "../context/AppContext";
import { catalogService } from "../services/catalogService";
import { cx, useRoute } from "../lib/utils";
import { Icon } from "../components/icons";
import { Button, Drawer, EmptyState, SkeletonCard, Toggle } from "../components/ui";
import { ProductCard } from "../features/StoreChrome";

interface ShopFilters {
  q: string;
  cat: string;
  brands: string[];
  min: number;
  max: number;
  fiveG: boolean;
  inStock: boolean;
  deal: boolean;
  sort: string;
}

const DEFAULT_FILTERS: ShopFilters = { q: "", cat: "", brands: [], min: 0, max: 2000, fiveG: false, inStock: false, deal: false, sort: "featured" };

export function ShopPage({ dealsOnly }: { dealsOnly?: boolean }) {
  const { dbVersion } = useApp();
  const route = useRoute();
  const [f, setF] = useState<ShopFilters>(DEFAULT_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [booted, setBooted] = useState(false);

  const qs = route.query.toString();
  useEffect(() => {
    setF((prev) => ({
      ...prev,
      q: route.query.get("q") ?? "",
      cat: route.query.get("cat") ?? "",
      deal: dealsOnly || route.query.get("deal") === "1",
      sort: route.query.get("sort") ?? prev.sort,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs, dealsOnly]);

  useEffect(() => {
    if (booted) return;
    const t = window.setTimeout(() => {
      setLoading(false);
      setBooted(true);
    }, 420);
    return () => window.clearTimeout(t);
  }, [booted]);

  const patch = (p: Partial<ShopFilters>) => setF((prev) => ({ ...prev, ...p }));

  const products = useMemo(() => {
    void dbVersion;
    let list = catalogService.storeProducts();
    const q = f.q.trim().toLowerCase();
    if (q) list = list.filter((p) => `${p.name} ${p.brand} ${p.specs.chip}`.toLowerCase().includes(q));
    if (f.cat) list = list.filter((p) => p.categoryId === f.cat);
    if (f.brands.length) list = list.filter((p) => f.brands.includes(p.brand));
    list = list.filter((p) => {
      const price = p.deal ? p.price * (1 - p.deal.percent / 100) : p.price;
      return price >= f.min && price <= f.max;
    });
    if (f.fiveG) list = list.filter((p) => p.specs.fiveG);
    if (f.inStock) list = list.filter((p) => p.stock > 0);
    if (f.deal) list = list.filter((p) => p.deal && p.deal.endsAt > Date.now());
    if (f.sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    else if (f.sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    else if (f.sort === "newest") list = [...list].sort((a, b) => b.createdAt - a.createdAt);
    else if (f.sort === "rating") list = [...list].sort((a, b) => catalogService.ratingFor(b.id).avg - catalogService.ratingFor(a.id).avg);
    else list = [...list].sort((a, b) => Number(b.featured) - Number(a.featured) || b.sold - a.sold);
    return list;
  }, [f, dbVersion]);

  const cats = catalogService.categories();
  const brands = catalogService.brands();

  const chips: { label: string; clear: () => void }[] = [];
  if (f.cat) chips.push({ label: cats.find((c) => c.id === f.cat)?.name ?? "Category", clear: () => patch({ cat: "" }) });
  f.brands.forEach((b) => chips.push({ label: b, clear: () => patch({ brands: f.brands.filter((x) => x !== b) }) }));
  if (f.deal) chips.push({ label: "On deal", clear: () => patch({ deal: false }) });
  if (f.fiveG) chips.push({ label: "5G", clear: () => patch({ fiveG: false }) });
  if (f.inStock) chips.push({ label: "In stock", clear: () => patch({ inStock: false }) });
  if (f.min > 0 || f.max < 2000) chips.push({ label: "$" + f.min + " - $" + f.max, clear: () => patch({ min: 0, max: 2000 }) });

  const filterPanel = (
    <div className="space-y-7">
      <div>
        <FilterLabel>Category</FilterLabel>
        <div className="space-y-1">
          <FilterRow active={!f.cat} label="All devices" count={catalogService.storeProducts().length} onClick={() => patch({ cat: "" })} />
          {cats.map((c) => {
            const count = catalogService.storeProducts().filter((p) => p.categoryId === c.id).length;
            return <FilterRow key={c.id} active={f.cat === c.id} label={c.name} count={count} onClick={() => patch({ cat: f.cat === c.id ? "" : c.id })} />;
          })}
        </div>
      </div>
      <div>
        <FilterLabel>Brand</FilterLabel>
        <div className="space-y-2.5">
          {brands.map((b) => {
            const on = f.brands.includes(b);
            const toggleBrand = () => patch({ brands: on ? f.brands.filter((x) => x !== b) : [...f.brands, b] });
            return (
              <button key={b} onClick={toggleBrand} className="flex items-center gap-2.5 text-sm font-bold text-ink/70 hover:text-ink transition-colors w-full text-left">
                <span className={cx("w-[18px] h-[18px] grid place-items-center border-[1.5px] transition-colors", on ? "bg-volt border-volt text-ink" : "border-ink/25")}>
                  {on && <Icon name="check" size={11} strokeWidth={3} />}
                </span>
                {b}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <FilterLabel>Price range ($)</FilterLabel>
        <div className="flex items-center gap-2">
          <input type="number" min={0} value={f.min} onChange={(e) => patch({ min: Math.max(0, Number(e.target.value) || 0) })} className="field !py-2 text-sm" aria-label="Min price" />
          <span className="text-ink/30 font-bold">to</span>
          <input type="number" min={0} value={f.max} onChange={(e) => patch({ max: Math.max(0, Number(e.target.value) || 0) })} className="field !py-2 text-sm" aria-label="Max price" />
        </div>
      </div>
      <div>
        <FilterLabel>Quick filters</FilterLabel>
        <div className="space-y-3">
          <Toggle checked={f.fiveG} onChange={(v) => patch({ fiveG: v })} label="5G capable only" />
          <Toggle checked={f.inStock} onChange={(v) => patch({ inStock: v })} label="In stock now" />
          <Toggle checked={f.deal} onChange={(v) => patch({ deal: v })} label="On flash deal" />
        </div>
      </div>
      <Button variant="ghost" size="sm" icon="rotate" onClick={() => setF({ ...DEFAULT_FILTERS, sort: f.sort })}>
        Reset all filters
      </Button>
    </div>
  );

  const resultCount = products.length;
  const drawerTitle = chips.length > 0 ? "Filters (" + chips.length + ")" : "Filters";

  return (
    <div>
      <section className="bg-ink text-paper grid-dark border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-volt mb-3">
            <Icon name="bolt" size={12} /> {dealsOnly ? "Flash deals" : "Full catalog"}
          </p>
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="font-d text-3xl sm:text-4xl font-bold">{dealsOnly ? "Deals ending soon" : "The lineup"}</h1>
              <p className="mt-2 text-sm font-bold text-paper/50">
                {resultCount} device{resultCount === 1 ? "" : "s"}
                {f.q ? ` matching "${f.q}"` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5 items-center">
              <div className="flex items-center bg-ink2 border border-line focus-within:border-volt transition-colors notch-sm w-56 sm:w-64">
                <Icon name="search" size={15} className="ml-3 text-paper/40" />
                <input
                  value={f.q}
                  onChange={(e) => patch({ q: e.target.value })}
                  placeholder="Search devices..."
                  className="bg-transparent px-2.5 py-2.5 text-sm font-semibold w-full outline-none placeholder:text-paper/30"
                />
              </div>
              <select value={f.sort} onChange={(e) => patch({ sort: e.target.value })} className="field-dark !w-auto !py-2.5 text-sm cursor-pointer" aria-label="Sort products">
                <option value="featured">Sort: Featured</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="newest">Newest first</option>
                <option value="rating">Top rated</option>
              </select>
              <Button variant="outline" className="!border-paper/25 !text-paper lg:!hidden" icon="filter" onClick={() => setSheetOpen(true)}>
                Filters
                {chips.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 bg-volt text-white text-[10px] font-extrabold rounded-full">{chips.length}</span>}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid lg:grid-cols-[230px_1fr] gap-10">
        <aside className="hidden lg:block">
          <div className="sticky top-32">{filterPanel}</div>
        </aside>

        <div>
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {chips.map((chip) => (
                <span key={chip.label} className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-ink text-paper text-xs font-extrabold notch-sm">
                  {chip.label}
                  <button onClick={chip.clear} className="w-[18px] h-[18px] grid place-items-center hover:bg-paper/15 transition-colors" aria-label={"Remove " + chip.label}>
                    <Icon name="x" size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {loading ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <SkeletonCard key={n} />
              ))}
            </div>
          ) : resultCount === 0 ? (
            <EmptyState
              icon="search"
              title="No devices match those filters"
              sub="Loosen a filter or two - the perfect phone is in here somewhere."
              action={<Button variant="dark" icon="rotate" onClick={() => setF({ ...DEFAULT_FILTERS })}>Clear everything</Button>}
            />
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      <Drawer open={sheetOpen} onClose={() => setSheetOpen(false)} title={drawerTitle}>
        {filterPanel}
        <div className="mt-8">
          <Button full size="lg" onClick={() => setSheetOpen(false)}>
            Show {resultCount} device{resultCount === 1 ? "" : "s"}
          </Button>
        </div>
      </Drawer>
    </div>
  );
}

function FilterLabel({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-ink/45 mb-3">{children}</p>;
}

function FilterRow({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "w-full flex items-center justify-between px-3 py-2 text-sm font-bold transition-all border-l-[3px]",
        active ? "border-volt bg-volt/10 text-ink" : "border-transparent text-ink/55 hover:bg-ink/5 hover:text-ink"
      )}
    >
      {label}
      <span className="text-[11px] font-extrabold text-ink/35 tabular-nums">{count}</span>
    </button>
  );
}
