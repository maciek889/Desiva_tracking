import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/utils";

export async function GET() {
  try {
    await requireAuth(["Admin"]);

    const [orders, stages, timeEntries, workers, categories] = await Promise.all([
      prisma.order.findMany({ include: { stage: true, category: true } }),
      prisma.stage.findMany({ orderBy: { position: "asc" } }),
      prisma.timeEntry.findMany({ where: { isActive: false }, include: { stage: true, user: true } }),
      prisma.user.findMany({ where: { role: "Worker" } }),
      prisma.category.findMany(),
    ]);

    const completed = orders.filter(o => o.status === "completed");
    const active = orders.filter(o => o.status === "active");
    const totalValue = orders.reduce((s, o) => s + o.price, 0);
    const totalCost = timeEntries.reduce((s, t) => s + t.cost, 0);
    const avgTime = completed.length > 0
      ? timeEntries.reduce((s, t) => s + t.duration, 0) / completed.length : 0;
    const avgCost = completed.length > 0 ? totalCost / completed.length : 0;

    // Per stage
    const stageStats = stages.map(s => {
      const tes = timeEntries.filter(t => t.stageId === s.id);
      const queued = active.filter(o => o.stageId === s.id).length;
      return {
        id: s.id, name: s.name, position: s.position, type: s.type,
        totalTime: tes.reduce((sum, t) => sum + t.duration, 0),
        totalCost: tes.reduce((sum, t) => sum + t.cost, 0),
        queued,
      };
    });

    // Per worker
    const workerStats = workers.map(w => {
      const tes = timeEntries.filter(t => t.userId === w.id);
      return {
        id: w.id, name: w.login, rate: w.hourlyRate,
        totalHours: tes.reduce((s, t) => s + t.duration, 0) / 60,
        totalCost: tes.reduce((s, t) => s + t.cost, 0),
      };
    });

    // Per category
    const categoryStats = categories.map(c => {
      const catOrders = orders.filter(o => o.categoryId === c.id);
      return {
        id: c.id, name: c.name,
        count: catOrders.length,
        value: catOrders.reduce((s, o) => s + o.price, 0),
      };
    });

    return jsonResponse({
      kpi: { avgTime, avgCost, totalValue, totalCost, totalOrders: orders.length, completedOrders: completed.length },
      stageStats,
      workerStats,
      categoryStats,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return errorResponse(message, 500);
  }
}
