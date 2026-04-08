"use client";
import { useState, useEffect } from "react";
import { api, fmtPLN, fmtDate, fmtTime, canViewField } from "@/lib/client";
import { Badge, Modal, Btn, Field } from "@/components/ui";
import { Edit, Trash2 } from "lucide-react";

interface OrderDetailModalProps {
  order: any;
  stages: any[];
  categories: any[];
  colors: any[];
  onClose: () => void;
  onUpdated: () => void;
  userRole?: string;
  allowDelete?: boolean;
}

export default function OrderDetailModal({ order, stages, categories, colors, onClose, onUpdated, userRole, allowDelete = false }: OrderDetailModalProps) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    name: order.name, price: order.price, client: order.client,
    colorId: order.colorId, stageId: order.stageId, categoryId: order.categoryId,
    uwagi: order.uwagi || "", notatki: order.notatki || "",
    dueDate: order.dueDate ? new Date(order.dueDate).toISOString().split("T")[0] : "",
  });
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    api(`/api/orders/${order.id}`).then(setDetail).catch(console.error);
  }, [order.id]);

  const handleSave = async () => {
    await api(`/api/orders/${order.id}`, { method: "PATCH", body: JSON.stringify(form) });
    onUpdated();
  };

  const stageName = (id: string) => stages.find((s: any) => s.id === id)?.name || id;
  const colorName = (id: string) => colors.find((c: any) => c.id === id)?.name || id;
  const catName = (id: string) => categories.find((c: any) => c.id === id)?.name || id;
  const timeEntries = detail?.timeEntries || [];
  const totalTime = timeEntries.reduce((s: number, t: any) => s + t.duration, 0);
  const totalCost = timeEntries.reduce((s: number, t: any) => s + t.cost, 0);

  return (
    <Modal title={editing ? "Edytuj zamówienie" : order.name} onClose={onClose} width={560}>
      {editing ? (
        <>
          <Field label="Nazwa"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          {(canViewField("price", userRole) || canViewField("client", userRole)) && (
          <div className="grid grid-cols-2 gap-3">
            {canViewField("price", userRole) && <Field label="Cena (PLN)"><input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></Field>}
            {canViewField("client", userRole) && <Field label="Klient"><input value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} /></Field>}
          </div>
          )}
          <Field label="Kategoria">
            <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
              {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Etap">
            <select value={form.stageId} onChange={e => setForm({ ...form, stageId: e.target.value })}>
              {stages.sort((a: any, b: any) => a.position - b.position).map((s: any) => <option key={s.id} value={s.id}>{s.position}. {s.name}</option>)}
            </select>
          </Field>
          <Field label="Kolor">
            <select value={form.colorId} onChange={e => setForm({ ...form, colorId: e.target.value })}>
              {colors.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Termin realizacji">
            <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
          </Field>
          <Field label="Uwagi">
            <textarea value={form.uwagi} onChange={e => setForm({ ...form, uwagi: e.target.value })} placeholder="Uwagi do zamówienia" rows={2} maxLength={300} />
          </Field>
          {canViewField("notatki", userRole) && (
            <Field label="Notatki">
              <textarea value={form.notatki} onChange={e => setForm({ ...form, notatki: e.target.value })} placeholder="Notatki wewnętrzne" rows={2} maxLength={300} />
            </Field>
          )}
          <div className="flex gap-3 mt-4">
            <Btn variant="ghost" onClick={() => setEditing(false)} className="flex-1">Anuluj</Btn>
            <Btn onClick={handleSave} className="flex-1">Zapisz</Btn>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>ID</span><span className="font-mono text-xs">{order.id}</span></div>
            {canViewField("client", userRole) && <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>Klient</span><span>{order.client}</span></div>}
            {canViewField("price", userRole) && <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>Cena</span><span className="font-semibold" style={{ color: "var(--accent)" }}>{fmtPLN(order.price)}</span></div>}
            <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>Kategoria</span><span>{catName(order.categoryId)}</span></div>
            <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>Etap</span><Badge>{stageName(order.stageId)}</Badge></div>
            <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>Kolor</span><span className="text-xs">{colorName(order.colorId)}</span></div>
            <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>Data</span><span>{fmtDate(order.createdAt)}</span></div>
            {order.dueDate && <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>Termin</span><span>{fmtDate(order.dueDate)}</span></div>}
            {order.uwagi && <div className="text-sm"><span style={{ color: "var(--text-muted)" }}>Uwagi</span><div className="mt-1 text-xs whitespace-pre-wrap break-words">{order.uwagi}</div></div>}
            {canViewField("notatki", userRole) && order.notatki && <div className="text-sm"><span style={{ color: "var(--text-muted)" }}>Notatki</span><div className="mt-1 text-xs whitespace-pre-wrap break-words">{order.notatki}</div></div>}
          </div>

          {/* File upload */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-2">Pliki ({(detail?.files || order.files)?.length || 0}/5)</h3>
            {(detail?.files || order.files)?.map((f: any) => (
              <div key={f.id} className="flex items-center justify-between text-xs p-2 rounded-lg mb-1" style={{ background: "var(--bg-secondary)" }}>
                <a href={f.filepath} download={f.filename} className="hover:underline" style={{ color: "var(--accent)" }}>{f.filename}</a>
                <span style={{ color: "var(--text-muted)" }}>{(f.size / 1024).toFixed(1)} KB</span>
              </div>
            ))}
            {((detail?.files || order.files)?.length || 0) < 5 && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                const input = (e.target as HTMLFormElement).querySelector('input[type="file"]') as HTMLInputElement;
                if (!input.files?.[0]) return;
                const fd = new FormData();
                fd.append("orderId", order.id);
                fd.append("file", input.files[0]);
                await fetch("/api/files", { method: "POST", body: fd });
                onUpdated();
              }}>
                <div className="flex gap-2 mt-2">
                  <input type="file" className="text-xs" />
                  <Btn type="submit" size="sm">Wyślij</Btn>
                </div>
              </form>
            )}
          </div>

          {timeEntries.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3">Historia pracy</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {timeEntries.map((te: any) => (
                  <div key={te.id} className="flex items-center justify-between text-xs p-2 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
                    <div>
                      <span className="font-medium">{te.user?.login}</span>
                      <span className="mx-2" style={{ color: "var(--text-muted)" }}>·</span>
                      <span style={{ color: "var(--text-muted)" }}>{te.stage?.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>{fmtTime(te.duration)}</span>
                      {canViewField("laborCost", userRole) && <span style={{ color: "var(--accent)" }}>{fmtPLN(te.cost)}</span>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-3 pt-3 text-sm font-semibold" style={{ borderTop: "1px solid var(--border)" }}>
                <span>Razem: {fmtTime(totalTime)}</span>
                {canViewField("laborCost", userRole) && <span style={{ color: "var(--accent)" }}>{fmtPLN(totalCost)}</span>}
              </div>
            </div>
          )}

          <Btn onClick={() => setEditing(true)} className="w-full"><Edit size={16} /> Edytuj zamówienie</Btn>
          {allowDelete && userRole === "Admin" && (
            deleting ? (
              <div className="flex gap-3 mt-3">
                <Btn variant="ghost" onClick={() => setDeleting(false)} className="flex-1">Anuluj</Btn>
                <Btn variant="danger" onClick={async () => {
                  try {
                    await api(`/api/orders/${order.id}`, { method: "DELETE" });
                    onUpdated();
                  } catch (e) { console.error(e); setDeleting(false); }
                }} className="flex-1"><Trash2 size={16} /> Potwierdź usunięcie</Btn>
              </div>
            ) : (
              <Btn variant="danger" onClick={() => setDeleting(true)} className="w-full mt-3"><Trash2 size={16} /> Usuń zamówienie</Btn>
            )
          )}
        </>
      )}
    </Modal>
  );
}
