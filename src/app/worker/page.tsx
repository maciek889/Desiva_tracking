"use client";
import { useState, useEffect } from "react";
import { useFetch, useAuth, api, fmtPLN, canViewField } from "@/lib/client";
import { Badge, Card, Modal, Btn, Loader } from "@/components/ui";
import { Play, Pause, CheckCircle, Clock } from "lucide-react";
import type { PaginatedOrders } from "@/lib/types";

export default function WorkerPage() {
  const { user } = useAuth();
  const { data: stages } = useFetch<any[]>("/api/stages");
  const { data: ordersData, refetch: refetchOrders } = useFetch<PaginatedOrders>("/api/orders?status=active&limit=100");
  const { data: activeTimers, refetch: refetchTimers } = useFetch<any[]>("/api/timer/active");
  const { data: categories } = useFetch<any[]>("/api/categories");
  const { data: colors } = useFetch<any[]>("/api/colors");
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [tick, setTick] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  // Tick every second for timer display
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const orders = ordersData?.orders;
  if (!stages || !orders || !activeTimers) return <Loader />;

  const factoryStages = stages.filter((s: any) => s.type === "factory").sort((a: any, b: any) => a.position - b.position);
  const activeOrders = orders.filter((o: any) => factoryStages.some((s: any) => s.id === o.stageId));

  const getActiveTimer = (orderId: string) => activeTimers.find((t: any) => t.orderId === orderId);

  const getTimerDisplay = (orderId: string) => {
    const timer = getActiveTimer(orderId);
    if (!timer) return null;
    const elapsed = Math.floor((Date.now() - new Date(timer.startedAt).getTime()) / 1000);
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleStart = async (orderId: string) => {
    setActionLoading(true);
    try {
      await api("/api/timer/start", { method: "POST", body: JSON.stringify({ orderId }) });
      await refetchTimers();
    } catch (e: any) { alert(e.message); }
    setActionLoading(false);
  };

  const handlePause = async (orderId: string) => {
    setActionLoading(true);
    try {
      await api("/api/timer/pause", { method: "POST", body: JSON.stringify({ orderId }) });
      await refetchTimers();
    } catch (e: any) { alert(e.message); }
    setActionLoading(false);
  };

  const handleComplete = async (orderId: string) => {
    setActionLoading(true);
    try {
      const res = await api("/api/timer/complete", { method: "POST", body: JSON.stringify({ orderId }) });
      await refetchTimers();
      await refetchOrders();
      setSelected(null);
      if (res.completed) alert("Zamówienie zakończone i przeniesione do archiwum!");
    } catch (e: any) { alert(e.message); }
    setActionLoading(false);
  };

  const stageName = (id: string) => stages.find((s: any) => s.id === id)?.name || id;
  const catName = (id: string) => categories?.find((c: any) => c.id === id)?.name || id;
  const colorName = (id: string) => colors?.find((c: any) => c.id === id)?.name || id;

  const openDetail = async (order: any) => {
    setSelected(order);
    try {
      const d = await api(`/api/orders/${order.id}`);
      setDetail(d);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="p-6">
      <style>{`
        @media (min-width: 768px) and (orientation: landscape) {
          .worker-kanban { grid-template-columns: repeat(${factoryStages.length}, minmax(200px, 1fr)) !important; }
        }
      `}</style>
      <div className="worker-kanban grid gap-4 grid-cols-1">
        {factoryStages.map((stage: any) => {
          const stageOrders = activeOrders.filter((o: any) => o.stageId === stage.id);
          return (
            <div key={stage.id} className="rounded-xl p-3" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{stage.name}</span>
                <Badge>{stageOrders.length}</Badge>
              </div>
              <div className="space-y-2 min-h-[100px]">
                {stageOrders.map((order: any) => {
                  const hasTimer = !!getActiveTimer(order.id);
                  const timerText = getTimerDisplay(order.id);
                  return (
                    <div key={order.id} className="rounded-lg p-3 cursor-pointer transition-all hover:scale-[1.02]"
                      style={{ background: "var(--bg-card)", border: hasTimer ? "1px solid var(--green)" : "1px solid var(--border)" }}
                      onClick={() => openDetail(order)}>
                      <div className="text-sm font-medium mb-1">{order.name}</div>
                      {canViewField("client", user?.role) && <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{order.client}</div>}
                      {order.uwagi && <div className="text-xs mb-2 line-clamp-2" style={{ color: "var(--text-secondary)" }}>{order.uwagi}</div>}
                      {timerText && (
                        <div className="flex items-center gap-2">
                          <Clock size={12} style={{ color: "var(--green)" }} />
                          <span className="text-xs font-mono" style={{ color: "var(--green)" }}>{timerText}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                {stageOrders.length === 0 && (
                  <div className="text-center py-8 text-xs" style={{ color: "var(--text-muted)" }}>Brak zamówień</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (() => {
        const hasTimer = !!getActiveTimer(selected.id);
        const timerText = getTimerDisplay(selected.id);
        return (
          <Modal title={selected.name} onClose={() => { setSelected(null); setDetail(null); }}>
            <div className="space-y-3 mb-6">
              {canViewField("client", user?.role) && <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>Klient</span><span>{selected.client}</span></div>}
              {canViewField("price", user?.role) && <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>Cena</span><span style={{ color: "var(--accent)" }}>{fmtPLN(selected.price)}</span></div>}
              <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>Kategoria</span><span>{catName(selected.categoryId)}</span></div>
              <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>Etap</span><Badge>{stageName(selected.stageId)}</Badge></div>
              <div className="flex justify-between text-sm"><span style={{ color: "var(--text-muted)" }}>Kolor</span><span className="text-xs">{colorName(selected.colorId)}</span></div>
              {selected.uwagi && <div className="text-sm"><span style={{ color: "var(--text-muted)" }}>Uwagi</span><div className="mt-1 text-xs whitespace-pre-wrap break-words">{selected.uwagi}</div></div>}
            </div>

            {/* Pliki */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-2">Pliki ({detail?.files?.length || 0})</h3>
              {detail?.files?.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between text-xs p-2 rounded-lg mb-1" style={{ background: "var(--bg-secondary)" }}>
                  <a href={f.filepath} download={f.filename} className="hover:underline" style={{ color: "var(--accent)" }}>{f.filename}</a>
                  <span style={{ color: "var(--text-muted)" }}>{(f.size / 1024).toFixed(1)} KB</span>
                </div>
              ))}
              {(!detail?.files || detail.files.length === 0) && (
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>Brak plików</div>
              )}
            </div>

            <div className="text-center py-6 rounded-xl mb-6" style={{ background: "var(--bg-secondary)" }}>
              <div className="text-4xl font-mono font-bold mb-1" style={{ color: hasTimer ? "var(--green)" : "var(--text-primary)" }}>
                {timerText || "00:00:00"}
              </div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                {hasTimer ? "W trakcie..." : "Gotowe do startu"}
              </div>
            </div>

            <div className="flex gap-3">
              {!hasTimer ? (
                <Btn onClick={() => handleStart(selected.id)} disabled={actionLoading} className="flex-1">
                  <Play size={16} /> Start
                </Btn>
              ) : (
                <Btn onClick={() => handlePause(selected.id)} variant="ghost" disabled={actionLoading} className="flex-1">
                  <Pause size={16} /> Pauza
                </Btn>
              )}
              <Btn onClick={() => handleComplete(selected.id)} variant="success" disabled={actionLoading} className="flex-1">
                <CheckCircle size={16} /> Zakończ etap
              </Btn>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}
