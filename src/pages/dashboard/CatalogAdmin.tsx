import { useMemo, useState } from "react";
import type { Product } from "../../types";
import { useApp } from "../../context/AppContext";
import { catalogService } from "../../services/catalogService";
import type { ProductInput } from "../../services/catalogService";
import { commerceService } from "../../services/commerceService";
import { can, PERMS } from "../../lib/rbac";
import type { Route } from "../../lib/utils";
import { money } from "../../lib/utils";
import { Icon } from "../../components/icons";
import { Badge, Button, Confirm, EmptyState, Input, Modal, Select, Stars, Tabs, Textarea, Toggle } from "../../components/ui";
import { PhoneArt } from "../../components/PhoneArt";

const CAT_ICONS = ["flag", "scale", "coin", "fold", "gamepad", "refresh", "phone", "box", "zap", "cpu"];

export function CatalogAdmin({ route }: { route: Route }) {
  const { user, dbVersion, toast, refresh } = useApp();
  const [tab, setTab] = useState(route.query.get("tab") === "categories" ? "categories" : "products");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState<Product | "new" | null>(route.query.get("new") === "1" ? "new" : null);
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [catModal, setCatModal] = useState<{ id?: string; name: string; icon: string; blurb: string } | null>(null);
  const [catDelete, setCatDelete] = useState<{ id: string; name: string } | null>(null);

  const canWrite = can(user?.role, PERMS.PROD_W);
  const canCat = can(user?.role, PERMS.CAT_W);

  const products = useMemo(() => {
    void dbVersion;
    let list = catalogService.adminProducts();
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((p) => (p.name + " " + p.brand).toLowerCase().includes(q));
    if (statusFilter !== "all") list = list.filter((p) => p.status === statusFilter);
    return list;
  }, [search, statusFilter, dbVersion]);

  const cats = useMemo(() => {
    void dbVersion;
    return catalogService.categories();
  }, [dbVersion]);

  const saveCategory = () => {
    if (!catModal || !user) return;
    try {
      catalogService.saveCategory(user, { name: catModal.name, icon: catModal.icon, blurb: catModal.blurb }, catModal.id);
      toast(catModal.id ? "Category updated" : "Category created");
      setCatModal(null);
      refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Save failed", "error");
    }
  };

  return (
    <div>
      <Tabs
        tabs={[
          { id: "products", label: `Products (${catalogService.adminProducts().length})`, icon: "box" },
          { id: "categories", label: `Categories (${cats.length})`, icon: "tag" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "products" && (
        <>
          <div className="flex flex-wrap gap-2.5 items-center mb-5">
            <div className="flex items-center bg-white border border-linel focus-within:border-volt transition-colors w-60">
              <Icon name="search" size={15} className="ml-3 text-ink/35" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="bg-transparent px-2.5 py-2.5 text-sm font-semibold w-full outline-none" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="field !w-auto !py-2.5 text-sm cursor-pointer">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </select>
            {canWrite && (
              <Button size="md" icon="plus" className="ml-auto" onClick={() => setEditing("new")}>
                Add product
              </Button>
            )}
          </div>

          <div className="bg-white border border-linel overflow-x-auto">
            <table className="tbl w-full min-w-[820px]">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Sold</th>
                  <th>Rating</th>
                  <th>Status</th>
                  {canWrite && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const cat = catalogService.categoryById(p.categoryId);
                  const rating = catalogService.ratingFor(p.id);
                  return (
                    <tr key={p.id} className={p.status === "draft" ? "opacity-55" : ""}>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className="w-9 h-12 shrink-0 bg-mist grid place-items-center overflow-hidden">
                            <PhoneArt visual={p.visual} className="h-11" showReflection={false} />
                          </span>
                          <div className="min-w-0">
                            <p className="font-extrabold text-[13px] truncate max-w-[220px]">{p.name}</p>
                            <p className="text-[11px] font-bold text-ink/40">{p.brand}{p.deal ? ` · -${p.deal.percent}% deal` : ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-ink/60">{cat?.name ?? "—"}</td>
                      <td className="font-bold tabular-nums">{money(p.price)}</td>
                      <td>
                        <Badge tone={p.stock === 0 ? "bad" : p.stock <= commerceLowStock() ? "warn" : "ok"}>{p.stock}</Badge>
                      </td>
                      <td className="tabular-nums text-ink/60">{p.sold}</td>
                      <td><Stars value={rating.avg} size={11} showValue={rating.count > 0} /></td>
                      <td><Badge tone={p.status === "active" ? "ok" : "mist"}>{p.status}</Badge></td>
                      {canWrite && (
                        <td>
                          <div className="flex justify-end gap-1">
                            <RowBtn icon="edit" label="Edit" onClick={() => setEditing(p)} />
                            <RowBtn icon={p.status === "active" ? "eye" : "check"} label={p.status === "active" ? "Unpublish" : "Publish"} onClick={() => {
                              if (!user) return;
                              catalogService.saveProduct(user, productToInput(p, p.status === "active" ? "draft" : "active"), p.id);
                              toast(p.status === "active" ? "Moved to draft" : "Published to store");
                              refresh();
                            }} />
                            <RowBtn icon="trash" label="Delete" danger onClick={() => setToDelete(p)} />
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {products.length === 0 && <EmptyState icon="box" title="No products match" sub="Adjust the search or add a new device." />}
          </div>
        </>
      )}

      {tab === "categories" && (
        <div className="bg-white border border-linel">
          <div className="flex items-center justify-between px-5 py-4 border-b border-linel">
            <p className="text-sm font-extrabold text-ink/60">Categories power the storefront navigation and filters.</p>
            {canCat && <Button size="sm" icon="plus" onClick={() => setCatModal({ name: "", icon: "phone", blurb: "" })}>Add category</Button>}
          </div>
          {cats.map((c) => {
            const count = catalogService.adminProducts().filter((p) => p.categoryId === c.id).length;
            return (
              <div key={c.id} className="flex items-center gap-4 px-5 py-3.5 border-b border-linel last:border-0 hover:bg-mist/50 transition-colors">
                <span className="w-9 h-9 grid place-items-center bg-ink text-volt notch-sm shrink-0">
                  <Icon name={c.icon} size={16} />
                </span>
                <div className="grow min-w-0">
                  <p className="text-sm font-extrabold">{c.name} <span className="text-ink/30 font-bold text-xs">/{c.slug}</span></p>
                  <p className="text-xs font-bold text-ink/45">{c.blurb}</p>
                </div>
                <Badge tone="mist">{count} products</Badge>
                {canCat && (
                  <div className="flex gap-1">
                    <RowBtn icon="edit" label="Edit" onClick={() => setCatModal({ id: c.id, name: c.name, icon: c.icon, blurb: c.blurb })} />
                    <RowBtn icon="trash" label="Delete" danger onClick={() => setCatDelete({ id: c.id, name: c.name })} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editing && <ProductEditor initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}

      <Confirm
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title={"Delete " + (toDelete?.name ?? "")}
        body="This permanently removes the product and its reviews from the catalog. Orders already placed keep their line items."
        onConfirm={() => {
          if (!toDelete || !user) return;
          try {
            catalogService.deleteProduct(user, toDelete.id);
            toast("Product deleted", "info");
            refresh();
          } catch (err) {
            toast(err instanceof Error ? err.message : "Delete failed", "error");
          }
        }}
      />

      <Modal open={!!catModal} onClose={() => setCatModal(null)} title={catModal?.id ? "Edit category" : "New category"}>
        {catModal && (
          <div className="space-y-4">
            <Input label="Name" value={catModal.name} onChange={(e) => setCatModal({ ...catModal, name: e.target.value })} placeholder="Flagship" />
            <Input label="Blurb" value={catModal.blurb} onChange={(e) => setCatModal({ ...catModal, blurb: e.target.value })} placeholder="Short description" />
            <div>
              <p className="block mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink/50">Icon</p>
              <div className="flex flex-wrap gap-2">
                {CAT_ICONS.map((ic) => (
                  <button
                    key={ic}
                    onClick={() => setCatModal({ ...catModal, icon: ic })}
                    className={"w-10 h-10 grid place-items-center border-[1.5px] transition-all " + (catModal.icon === ic ? "border-volt bg-volt/10 text-voltd" : "border-linel text-ink/45 hover:border-ink/30")}
                    aria-label={ic}
                  >
                    <Icon name={ic} size={17} />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <Button variant="ghost" onClick={() => setCatModal(null)}>Cancel</Button>
              <Button onClick={saveCategory} icon="check">Save category</Button>
            </div>
          </div>
        )}
      </Modal>

      <Confirm
        open={!!catDelete}
        onClose={() => setCatDelete(null)}
        title={"Delete " + (catDelete?.name ?? "")}
        body="Categories with products cannot be deleted — reassign products to another category first."
        onConfirm={() => {
          if (!catDelete || !user) return;
          try {
            catalogService.deleteCategory(user, catDelete.id);
            toast("Category deleted", "info");
            refresh();
          } catch (err) {
            toast(err instanceof Error ? err.message : "Delete failed", "error");
          }
        }}
      />
    </div>
  );
}

function commerceLowStock(): number {
  return commerceService.settings().lowStockThreshold;
}

function RowBtn({ icon, label, onClick, danger }: { icon: string; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={"w-8 h-8 grid place-items-center border border-linel transition-colors " + (danger ? "text-ink/40 hover:text-bad hover:border-bad" : "text-ink/40 hover:text-voltd hover:border-volt")}
    >
      <Icon name={icon} size={14} />
    </button>
  );
}

/* --------------------------- product editor --------------------------- */

interface PForm {
  name: string;
  brand: string;
  categoryId: string;
  price: string;
  compareAt: string;
  stock: string;
  featured: boolean;
  status: "active" | "draft";
  dealPercent: string;
  dealDays: string;
  body: string;
  screenA: string;
  screenB: string;
  galleryText: string;
  display: string;
  chip: string;
  ram: string;
  storage: string;
  battery: string;
  camera: string;
  os: string;
  fiveG: boolean;
  weight: string;
  description: string;
  highlightsText: string;
}

function productToInput(p: Product, status?: "active" | "draft"): ProductInput {
  return {
    name: p.name,
    brand: p.brand,
    categoryId: p.categoryId,
    price: p.price,
    compareAt: p.compareAt,
    stock: p.stock,
    featured: p.featured,
    dealPercent: p.deal?.percent ?? null,
    dealDays: p.deal ? Math.max(1, Math.round((p.deal.endsAt - Date.now()) / 86400000)) : 2,
    visual: p.visual,
    gallery: p.gallery,
    specs: p.specs,
    description: p.description,
    highlights: p.highlights,
    status: status ?? p.status,
  };
}

function fromProduct(p: Product | null, cats: { id: string }[]): PForm {
  if (!p) {
    return {
      name: "", brand: "", categoryId: cats[0]?.id ?? "", price: "", compareAt: "", stock: "10", featured: false, status: "active",
      dealPercent: "", dealDays: "2", body: "#33363d", screenA: "#12262e", screenB: "#2f6bff", galleryText: "",
      display: "", chip: "", ram: "", storage: "", battery: "", camera: "", os: "", fiveG: true, weight: "",
      description: "", highlightsText: "",
    };
  }
  return {
    name: p.name,
    brand: p.brand,
    categoryId: p.categoryId,
    price: String(p.price),
    compareAt: p.compareAt != null ? String(p.compareAt) : "",
    stock: String(p.stock),
    featured: p.featured,
    status: p.status,
    dealPercent: p.deal ? String(p.deal.percent) : "",
    dealDays: p.deal ? String(Math.max(1, Math.round((p.deal.endsAt - Date.now()) / 86400000))) : "2",
    body: p.visual.body,
    screenA: p.visual.screenA,
    screenB: p.visual.screenB,
    galleryText: p.gallery.slice(1).join(", "),
    display: p.specs.display,
    chip: p.specs.chip,
    ram: p.specs.ram,
    storage: p.specs.storage,
    battery: p.specs.battery,
    camera: p.specs.camera,
    os: p.specs.os,
    fiveG: p.specs.fiveG,
    weight: p.specs.weight,
    description: p.description,
    highlightsText: p.highlights.join("\n"),
  };
}

const HEX = /^#[0-9a-fA-F]{6}$/;

function ProductEditor({ initial, onClose }: { initial: Product | null; onClose: () => void }) {
  const { user, toast, refresh } = useApp();
  const cats = catalogService.categories();
  const brands = catalogService.brands();
  const [f, setF] = useState<PForm>(() => fromProduct(initial, cats));
  const set = (patch: Partial<PForm>) => setF((prev) => ({ ...prev, ...patch }));

  const gallery = f.galleryText
    .split(",")
    .map((s) => s.trim())
    .filter((s) => HEX.test(s));

  const submit = () => {
    if (!user) return;
    const price = Number(f.price);
    const compareAt = f.compareAt.trim() ? Number(f.compareAt) : null;
    if (!f.name.trim()) return toast("Product name is required", "error");
    if (!f.brand.trim()) return toast("Brand is required", "error");
    if (!(price > 0)) return toast("Price must be greater than 0", "error");
    if (compareAt != null && compareAt <= price) return toast("Compare-at price must exceed price", "error");
    const input: ProductInput = {
      name: f.name,
      brand: f.brand,
      categoryId: f.categoryId,
      price,
      compareAt,
      stock: Math.max(0, Math.round(Number(f.stock) || 0)),
      featured: f.featured,
      dealPercent: f.dealPercent.trim() ? Math.round(Number(f.dealPercent)) : null,
      dealDays: Math.max(1, Math.round(Number(f.dealDays) || 2)),
      visual: { body: f.body, screenA: f.screenA, screenB: f.screenB },
      gallery,
      specs: {
        display: f.display || "6.5\" OLED",
        chip: f.chip || "Unspecified chipset",
        ram: f.ram || "8 GB",
        storage: f.storage || "128 GB",
        battery: f.battery || "4,500 mAh",
        camera: f.camera || "Dual camera",
        os: f.os || "Android",
        fiveG: f.fiveG,
        weight: f.weight || "190 g",
      },
      description: f.description,
      highlights: f.highlightsText.split("\n").map((s) => s.trim()).filter(Boolean),
      status: f.status,
    };
    try {
      catalogService.saveProduct(user, input, initial?.id);
      toast(initial ? "Product updated" : "Product created");
      refresh();
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Save failed", "error");
    }
  };

  const colorField = (label: string, key: "body" | "screenA" | "screenB") => (
    <label className="flex items-center justify-between gap-3 border border-linel px-3 py-2.5 bg-white">
      <span className="text-xs font-extrabold text-ink/55 uppercase tracking-wide">{label}</span>
      <input type="color" value={f[key]} onChange={(e) => set({ [key]: e.target.value } as Partial<PForm>)} className="w-9 h-7 cursor-pointer border-0 bg-transparent" aria-label={label} />
    </label>
  );

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={initial ? "Edit — " + initial.name : "New product"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button icon="check" onClick={submit}>{initial ? "Save changes" : "Create product"}</Button>
        </>
      }
    >
      <div className="grid md:grid-cols-[1fr_240px] gap-6">
        <div className="space-y-6">
          <section>
            <EditorHead n="01" t="Basics" />
            <div className="grid sm:grid-cols-2 gap-3.5">
              <Input label="Name" value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Pixel 9 Pro" />
              <div>
                <p className="block mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink/50">Brand</p>
                <input list="brand-list" value={f.brand} onChange={(e) => set({ brand: e.target.value })} className="field" placeholder="Google" />
                <datalist id="brand-list">
                  {brands.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>
              <Select label="Category" value={f.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
              <Select label="Status" value={f.status} onChange={(e) => set({ status: e.target.value as "active" | "draft" })}>
                <option value="active">Active — visible in store</option>
                <option value="draft">Draft — hidden</option>
              </Select>
              <Input label="Price ($)" type="number" min={0} value={f.price} onChange={(e) => set({ price: e.target.value })} />
              <Input label="Compare-at ($, optional)" type="number" min={0} value={f.compareAt} onChange={(e) => set({ compareAt: e.target.value })} />
              <Input label="Stock" type="number" min={0} value={f.stock} onChange={(e) => set({ stock: e.target.value })} />
              <div className="flex items-end pb-1.5">
                <Toggle checked={f.featured} onChange={(v) => set({ featured: v })} label="Featured on homepage" />
              </div>
            </div>
          </section>

          <section>
            <EditorHead n="02" t="Flash deal (optional)" />
            <div className="grid grid-cols-2 gap-3.5">
              <Input label="Discount %" type="number" min={0} max={90} value={f.dealPercent} onChange={(e) => set({ dealPercent: e.target.value })} placeholder="15" hint="Leave empty for no deal" />
              <Input label="Runs for (days)" type="number" min={1} value={f.dealDays} onChange={(e) => set({ dealDays: e.target.value })} />
            </div>
          </section>

          <section>
            <EditorHead n="03" t="Finish & art" />
            <div className="grid grid-cols-3 gap-2.5">
              {colorField("Body", "body")}
              {colorField("Screen A", "screenA")}
              {colorField("Screen B", "screenB")}
            </div>
            <div className="mt-3">
              <Input label="Extra finishes (comma-separated hex)" value={f.galleryText} onChange={(e) => set({ galleryText: e.target.value })} placeholder="#17181c, #e8e0d4" hint="Shown as selectable swatches on the product page" />
            </div>
          </section>

          <section>
            <EditorHead n="04" t="Specs" />
            <div className="grid sm:grid-cols-2 gap-3.5">
              <Input label="Display" value={f.display} onChange={(e) => set({ display: e.target.value })} placeholder='6.7" LTPO OLED · 120Hz' />
              <Input label="Chipset" value={f.chip} onChange={(e) => set({ chip: e.target.value })} placeholder="Tensor G4" />
              <Input label="RAM" value={f.ram} onChange={(e) => set({ ram: e.target.value })} placeholder="12 GB" />
              <Input label="Storage" value={f.storage} onChange={(e) => set({ storage: e.target.value })} placeholder="256 GB" />
              <Input label="Battery" value={f.battery} onChange={(e) => set({ battery: e.target.value })} placeholder="5,000 mAh" />
              <Input label="Camera" value={f.camera} onChange={(e) => set({ camera: e.target.value })} placeholder="50 MP triple" />
              <Input label="OS" value={f.os} onChange={(e) => set({ os: e.target.value })} placeholder="Android 15" />
              <Input label="Weight" value={f.weight} onChange={(e) => set({ weight: e.target.value })} placeholder="210 g" />
            </div>
            <div className="mt-3">
              <Toggle checked={f.fiveG} onChange={(v) => set({ fiveG: v })} label="5G capable" />
            </div>
          </section>

          <section>
            <EditorHead n="05" t="Content" />
            <Textarea label="Description" value={f.description} onChange={(e) => set({ description: e.target.value })} placeholder="Two sentences that sell it." />
            <div className="mt-3.5">
              <Textarea label="Highlights (one per line)" value={f.highlightsText} onChange={(e) => set({ highlightsText: e.target.value })} placeholder={"AI camera tricks\n7 years of updates"} />
            </div>
          </section>
        </div>

        <div className="md:sticky md:top-0 h-fit">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-ink/45 mb-2.5">Live preview</p>
          <div className="border border-linel grid place-items-center p-4" style={{ background: `linear-gradient(150deg, ${f.screenA}22, ${f.screenB}26), #e8edf5` }}>
            <PhoneArt visual={{ body: f.body, screenA: f.screenA, screenB: f.screenB }} tilt={-6} className="h-56" />
          </div>
          <div className="bg-white border border-linel p-4 mt-3 space-y-2">
            <p className="text-sm font-extrabold leading-snug">{f.name || "Untitled device"}</p>
            <p className="text-xs font-bold text-ink/45">{f.brand || "Brand"} · {f.ram || "—"} · {f.storage || "—"}</p>
            <p className="font-d text-lg font-bold tabular-nums">{f.price ? money(Number(f.price) || 0) : "$0"}</p>
            <div className="flex gap-1.5 flex-wrap">
              {f.dealPercent && <Badge tone="tang">-{f.dealPercent}%</Badge>}
              {f.featured && <Badge tone="volt">Featured</Badge>}
              <Badge tone={f.status === "active" ? "ok" : "mist"}>{f.status}</Badge>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function EditorHead({ n, t }: { n: string; t: string }) {
  return (
    <p className="flex items-center gap-2.5 mb-3.5">
      <span className="font-d text-[11px] font-bold text-volt">{n}</span>
      <span className="font-d text-sm font-bold">{t}</span>
      <span className="h-px grow bg-linel" />
    </p>
  );
}
