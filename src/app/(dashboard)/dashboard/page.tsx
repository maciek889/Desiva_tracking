"use client";
import { useState } from "react";
import { useFetch, fmtPLN, fmtTime } from "@/lib/client";
import { Card, Badge, Loader } from "@/components/ui";
import { Clock, DollarSign, TrendingUp, Package } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const CHART_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899", "#8b5cf6", "#14b8a6"];
const tooltipStyle = { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, color: "#111827" };

export default function DashboardPage() {
  const { data, loading } = useFetch<any>("/api/stats");
  const [tab, setTab] = useState("time");

  if (loading || !data) return <Loader />;

  const { kpi, stageStats, workerStats, categoryStats } = data;

  const kpis = [
    { label: "Średni czas", value: fmtTime(kpi.avgTime), icon: Clock },
    { label: "Średni koszt", value: fmtPLN(kpi.avgCost), icon: DollarSign },
    { label: "Wartość zamówień", value: fmtPLN(kpi.totalValue), icon: TrendingUp },
    { label: "Koszt produkcji", value: fmtPLN(kpi.totalCost), icon: Package },
  ];

  const tabs = [
    { id: "time", label: "Czas" },
    { id: "costs", label: "Koszty" },
    { id: "workers", label: "Pracownicy" },
    { id: "stages", label: "Etapy" },
  ];

  const stageChartData = stageStats.map((s: any) => ({ name: s.name.split(" ").slice(0, 2).join(" "), time: s.totalTime, cost: s.totalCost, queued: s.queued }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <Card key={k.label}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ background: "rgba(0,0,0,0.06)" }}><k.icon size={20} style={{ color: "#000" }} /></div>
              <div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>{k.label}</div>
                <div className="text-lg font-bold mt-0.5">{k.value}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-semibold mb-4">Czas na etap</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stageChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmtTime(v), "Czas"]} />
              <Bar dataKey="time" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold mb-4">Zamówienia wg kategorii</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={categoryStats} cx="50%" cy="50%" outerRadius={90} dataKey="count" nameKey="name"
                label={({ name, count }: any) => `${name}: ${count}`}>
                {categoryStats.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Worker stats */}
      <Card>
        <h3 className="text-sm font-semibold mb-4">Statystyki pracowników</h3>
        <div className="space-y-3">
          {workerStats.map((w: any) => (
            <div key={w.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "var(--accent)", color: "#fff" }}>{w.name[0]}</div>
                <div>
                  <div className="text-sm font-medium">{w.name}</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>{fmtPLN(w.rate)}/h</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{w.totalHours.toFixed(1)}h</div>
                <div className="text-xs" style={{ color: "var(--accent)" }}>{fmtPLN(w.totalCost)}</div>
              </div>
            </div>
          ))}
          {workerStats.length === 0 && <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>Brak danych</p>}
        </div>
      </Card>

      {/* Detail Tabs */}
      <Card>
        <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all"
              style={{ background: tab === t.id ? "var(--accent)" : "transparent", color: tab === t.id ? "#fff" : "var(--text-muted)" }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "time" && (
          <div>
            <h4 className="text-sm font-semibold mb-3">Średni czas na etap</h4>
            <div className="space-y-2">
              {stageStats.map((s: any) => {
                const maxTime = Math.max(...stageStats.map((d: any) => d.totalTime), 1);
                return (
                  <div key={s.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: "var(--text-secondary)" }}>{s.name}</span>
                      <span>{fmtTime(s.totalTime)}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
                      <div className="h-full rounded-full" style={{ width: `${(s.totalTime / maxTime) * 100}%`, background: "var(--accent)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "costs" && (
          <div>
            <h4 className="text-sm font-semibold mb-3">Koszt na pracownika</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={workerStats.map((w: any) => ({ name: w.name, cost: w.totalCost }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmtPLN(v), "Koszt"]} />
                <Bar dataKey="cost" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {tab === "workers" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Pracownik", "Stawka", "Godziny", "Koszt"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase" style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workerStats.map((w: any) => (
                  <tr key={w.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="px-4 py-3 font-medium">{w.name}</td>
                    <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{fmtPLN(w.rate)}/h</td>
                    <td className="px-4 py-3">{w.totalHours.toFixed(1)}h</td>
                    <td className="px-4 py-3" style={{ color: "var(--accent)" }}>{fmtPLN(w.totalCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "stages" && (
          <div>
            <h4 className="text-sm font-semibold mb-3">Zamówienia w kolejce</h4>
            <div className="space-y-2">
              {stageStats.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
                  <span className="text-sm">{s.name}</span>
                  <Badge color={s.queued > 3 ? "var(--red)" : s.queued > 1 ? "var(--orange)" : "var(--green)"}>{s.queued}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
