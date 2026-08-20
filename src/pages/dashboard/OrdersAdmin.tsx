import { useMemo, useState } from "react";
import type { Order, OrderStatus } from "../../types";
import { useApp } from "../../context/AppContext";
import { commerceService } from "../../services/commerceService";
import { can, PERMS } from "../../lib/rbac";
import { cx, dateTimeFmt, money } from "../../lib/utils";
import { Icon } from "../../components/icons";
import { Badge, Button, Confirm, Drawer, EmptyState, StatusBadge } from "../../components/ui";
import { PhoneArt } from "../../components/PhoneArt";
import { OrderTimeline } from "../AccountPage";

const STATUSES: ("all" | OrderStatus)[] = ["all", "pending", "confirmed", "shipped", "delivered", "cancelled"];

const ACTIONS: Partial<Record<OrderStatus, { to: OrderStatus; label: string; icon: string; variant: "primary" | "dark" | "danger" }[]>> = {
  pending: [
    { to: "confirmed", label: "Confirm", icon: "check", variant: "primary" },
    { to: "cancelled", label: "Cancel & restock", icon: "x", variant: "danger" },
  ],
  confirmed: [
    { to: "shipped", label: "Mark shipped", icon: "truck", variant: "primary" },
    { to: "cancelled", label: "Cancel & restock", icon: "x", variant: "danger" },
  ],
  shipped: [{ to: "delivered", label: "Mark delivered", icon: "box", variant: "dark" }],
};

export function OrdersAdmin() {
  const { user, dbVersion, toast, refresh } = useApp();
  const [status, setStatus] = useState<"all" | OrderStatus>("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ order: Order; to: OrderStatus; label: string } | null>(null);

  const orders = useMemo(() => (user ? commerceService.ordersFor(user) : []), [user, dbVersion]);
  const canUpdate = can(user?.role, PERMS.ORDER_W);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: orders.length };
    STATUSES.slice(1).forEach((s) => (map[s] = orders.filter((o) => o.status === s).length));
    return map;
  }, [orders]);

  const filtered = useMemo(() => {
    let list = orders;
    if (status !== "all") list = list.filter((o) => o.status === status);
    const query = q.trim().toLowerCase();
    if (query) list = list.filter((o) => (o.id + " " + o.email + " " + o.address.name).toLowerCase().includes(query));
    return list;
  }, [orders, status, q]);

  const selectedOrder = selected ? orders.find((o) => o.id === selected) ?? null : null;

  const setStatusSafe = (order: Order, to: OrderStatus) => {
    if (!user) return;
    try {
      commerceService.setStatus(user, order.id, to);
      toast(`${order.id} → ${to}`);
      refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Update failed", "error");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-5">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={cx(
              "px-3.5 py-2 text-[13px] font-extrabold capitalize transition-all notch-sm border",
              status === s ? "bg-ink text-paper border-ink" : "bg-white text-ink/55 border-linel hover:border-ink/30"
            )}
          >
            {s} <span className={status === s ? "text-volt" : "text-ink/35"}>({counts[s] ?? 0})</span>
          </button>
        ))}
        <div className="flex items-center bg-white border border-linel focus-within:border-volt transition-colors ml-auto w-56">
          <Icon name="search" size={15} className="ml-3 text-ink/35" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search id, email..." className="bg-transparent px-2.5 py-2 text-sm font-semibold w-full outline-none" />
        </div>
      </div>

      <div className="bg-white border border-linel overflow-x-auto">
        <table className="tbl w-full min-w-[760px]">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Placed</th>
              <th>Items</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th className="text-right">View</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="cursor-pointer" onClick={() => setSelected(o.id)}>
                <td className="font-d text-[13px] font-bold">{o.id}</td>
                <td>
                  <p className="font-extrabold text-[13px]">{o.address.name}</p>
                  <p className="text-[11px] font-bold text-ink/40">{o.email}</p>
                </td>
                <td className="text-ink/60 whitespace-nowrap">{dateTimeFmt(o.createdAt)}</td>
                <td className="tabular-nums text-ink/60">{o.items.reduce((s, i) => s + i.qty, 0)}</td>
                <td className="font-bold tabular-nums">{money(o.total)}</td>
                <td>
                  <span className="inline-flex items-center gap-1.5 text-ink/60 font-bold text-[13px]">
                    <Icon name={o.payment === "card" ? "card" : "cash"} size={14} /> {o.payment === "card" ? "Card" : "COD"}
                  </span>
                </td>
                <td><StatusBadge status={o.status} /></td>
                <td>
                  <span className="flex justify-end">
                    <Icon name="chevR" size={16} className="text-ink/30" />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState icon="cart" title="No orders here" sub="Try another status filter." />}
      </div>

      <Drawer open={!!selectedOrder} onClose={() => setSelected(null)} title={selectedOrder ? selectedOrder.id + " · " + selectedOrder.status : ""}>
        {selectedOrder && (
          <div className="space-y-6">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-ink/40 mb-3">Items</p>
              {selectedOrder.items.map((i) => (
                <div key={i.productId} className="flex items-center gap-3 py-2.5 border-b border-linel">
                  <span className="w-9 h-12 shrink-0 bg-mist grid place-items-center overflow-hidden">
                    <PhoneArt visual={{ body: i.body, screenA: i.screenA, screenB: i.screenB }} className="h-11" showReflection={false} />
                  </span>
                  <div className="grow min-w-0">
                    <p className="text-[13px] font-extrabold truncate">{i.name}</p>
                    <p className="text-[11px] font-bold text-ink/40">{i.brand} · qty {i.qty}</p>
                  </div>
                  <span className="text-sm font-bold tabular-nums">{money(i.price * i.qty)}</span>
                </div>
              ))}
              <div className="pt-3 space-y-1 text-[13px] font-bold text-ink/60">
                <p className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">{money(selectedOrder.subtotal)}</span></p>
                {selectedOrder.discount > 0 && (
                  <p className="flex justify-between text-voltd"><span>Coupon {selectedOrder.couponCode}</span><span>−{money(selectedOrder.discount)}</span></p>
                )}
                <p className="flex justify-between"><span>Shipping</span><span>{selectedOrder.shipping === 0 ? "FREE" : money(selectedOrder.shipping)}</span></p>
                <p className="flex justify-between text-ink font-extrabold text-[15px] pt-1.5 border-t border-linel mt-2"><span>Total</span><span className="font-d tabular-nums">{money(selectedOrder.total)}</span></p>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-ink/40 mb-3">Fulfilment timeline</p>
              <OrderTimeline status={selectedOrder.status} timeline={selectedOrder.timeline} />
            </div>

            <div className="bg-mist border border-linel p-4 text-[13px] font-bold text-ink/60 space-y-1.5">
              <p className="flex items-center gap-2"><Icon name="user" size={14} className="text-voltd" /> {selectedOrder.address.name} · {selectedOrder.address.phone}</p>
              <p className="flex items-center gap-2"><Icon name="truck" size={14} className="text-voltd" /> {selectedOrder.address.line}, {selectedOrder.address.city} {selectedOrder.address.zip}</p>
              <p className="flex items-center gap-2"><Icon name={selectedOrder.payment === "card" ? "card" : "cash"} size={14} className="text-voltd" /> {selectedOrder.payment === "card" ? "Paid by card" : "Cash on delivery"}</p>
            </div>

            {canUpdate && (ACTIONS[selectedOrder.status]?.length ?? 0) > 0 && (
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-ink/40 mb-3">Actions</p>
                <div className="flex flex-wrap gap-2">
                  {ACTIONS[selectedOrder.status]!.map((a) => (
                    <Button
                      key={a.to}
                      variant={a.variant}
                      size="sm"
                      icon={a.icon}
                      onClick={() => {
                        if (a.to === "cancelled") setConfirmAction({ order: selectedOrder, to: a.to, label: a.label });
                        else setStatusSafe(selectedOrder, a.to);
                      }}
                    >
                      {a.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      <Confirm
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction ? confirmAction.label + " " + confirmAction.order.id : ""}
        body="Cancelling restocks every line item and is logged to the audit trail. Continue?"
        confirmLabel="Yes, cancel order"
        onConfirm={() => {
          if (confirmAction) setStatusSafe(confirmAction.order, confirmAction.to);
        }}
      />
      <Badge tone="mist" className="mt-4 hidden">{orders.length} total</Badge>
    </div>
  );
}
