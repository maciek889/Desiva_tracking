"use client";
import { useState } from "react";
import { api, fmtPLN, fmtDate, canViewField } from "@/lib/client";
import { Badge, Card, Modal, Btn, Field } from "@/components/ui";
import { Plus, GripVertical, Edit } from "lucide-react";
import OrderDetailModal from "@/components/OrderDetailModal";

interface KanbanBoardProps {
  type: "office" | "factory";
  stages: any[];
  orders: any[];
  categories: any[];
  colors: any[];
  onRefresh: () => void;
  userRole?: string;
}

export default function KanbanBoard({ type, stages, orders, categories, colors, onRefresh, userRole }: KanbanBoardProps) {
  const [creating, setCreating] = useState(false);
  const [editOrder, setEditOrder] = useState<any>(null);

  const filteredStages = stages.filter((s: any) => s.type === type).sort((a: any, b: any) => a.position - b.position);
  const activeOrders = orders.filter((o: any) => o.status === "active");

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData("orderId");
    if (orderId) {
      await api(`/api/orders/${orderId}`, { method: "PATCH", body: JSON.stringify({ stageId }) });
      onRefresh();
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Btn onClick={() => setCreating(true)}><Plus size={16} /> Nowe zamówienie</Btn>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 500 }}>
        {filteredStages.map((stage: any) => {
          const stageOrders = activeOrders.filter((o: any) => o.stageId === stage.id);
          return (
            <div key={stage.id} className="flex-shrink-0 rounded-xl p-3"
              style={{ width: 280, background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
              onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, stage.id)}>
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{stage.name}</span>
                <Badge>{stageOrders.length}</Badge>
              </div>
              <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
                {stageOrders.map((order: any) => (
                  <div key={order.id} draggable
                    onDragStart={e => e.dataTransfer.setData("orderId", order.id)}
                    className="rounded-lg p-3 cursor-pointer transition-all hover:scale-[1.01]"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                    onClick={() => setEditOrder(order)}>
                    <div className="flex items-center gap-2 mb-1">
                      <GripVertical size={12} style={{ color: "var(--text-muted)" }} />
                      <span className="text-sm font-medium flex-1 truncate">{order.name}</span>
                    </div>
                    {canViewField("client", userRole) && <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{order.client}</div>}
                    <div className="flex items-center justify-between">
                      {canViewField("price", userRole) && <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>{fmtPLN(order.price)}</span>}
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{fmtDate(order.createdAt)}</span>
                    </div>
                  </div>
                ))}
                {stageOrders.length === 0 && (
                  <div className="text-center py-8 text-xs" style={{ color: "var(--text-muted)" }}>Brak zamówień</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {creating && (
        <CreateOrderModal stages={stages} categories={categories} colors={colors}
          defaultStageId={filteredStages[0]?.id} onClose={() => setCreating(false)} onCreated={onRefresh} userRole={userRole} />
      )}

      {editOrder && (
        <OrderDetailModal order={editOrder} stages={stages} categories={categories} colors={colors}
          onClose={() => setEditOrder(null)} onUpdated={() => { setEditOrder(null); onRefresh(); }} userRole={userRole} />
      )}
    </div>
  );
}

function CreateOrderModal({ stages, categories, colors, defaultStageId, onClose, onCreated, userRole }: any) {
  const [form, setForm] = useState({
    name: "", price: "", client: "",
    colorId: colors[0]?.id || "", stageId: defaultStageId || stages[0]?.id || "",
    categoryId: categories[0]?.id || "",
    uwagi: "", notatki: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.name) return;
    if (canViewField("price", userRole) && !form.price) return;
    if (canViewField("client", userRole) && !form.client) return;
    setSaving(true);
    try {
      const payload: any = { name: form.name, colorId: form.colorId, stageId: form.stageId, categoryId: form.categoryId, uwagi: form.uwagi };
      if (canViewField("price", userRole)) payload.price = form.price;
      if (canViewField("client", userRole)) payload.client = form.client;
      if (canViewField("notatki", userRole)) payload.notatki = form.notatki;
      await api("/api/orders", { method: "POST", body: JSON.stringify(payload) });
      onCreated();
      onClose();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  return (
    <Modal title="Nowe zamówienie" onClose={onClose} width={480}>
      <Field label="Nazwa">
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nazwa zamówienia" />
      </Field>
      {(canViewField("price", userRole) || canViewField("client", userRole)) && (
      <div className="grid grid-cols-2 gap-3">
        {canViewField("price", userRole) && <Field label="Cena (PLN)">
          <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0.00" />
        </Field>}
        {canViewField("client", userRole) && <Field label="Klient">
          <input value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} placeholder="Imię i nazwisko" />
        </Field>}
      </div>
      )}
      <Field label="Kategoria">
        <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
          {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Etap">
        <select value={form.stageId} onChange={e => setForm({ ...form, stageId: e.target.value })}>
          {stages.sort((a: any, b: any) => a.position - b.position).map((s: any) => (
            <option key={s.id} value={s.id}>{s.position}. {s.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Kolor">
        <select value={form.colorId} onChange={e => setForm({ ...form, colorId: e.target.value })}>
          {colors.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Uwagi">
        <textarea value={form.uwagi} onChange={e => setForm({ ...form, uwagi: e.target.value })} placeholder="Uwagi do zamówienia" rows={2} maxLength={300} />
      </Field>
      {canViewField("notatki", userRole) && (
        <Field label="Notatki">
          <textarea value={form.notatki} onChange={e => setForm({ ...form, notatki: e.target.value })} placeholder="Notatki wewnętrzne" rows={2} maxLength={300} />
        </Field>
      )}
      <div className="flex gap-3 mt-6">
        <Btn variant="ghost" onClick={onClose} className="flex-1">Anuluj</Btn>
        <Btn onClick={handleSubmit} disabled={saving} className="flex-1">{saving ? "Tworzenie..." : "Utwórz zamówienie"}</Btn>
      </div>
    </Modal>
  );
}
