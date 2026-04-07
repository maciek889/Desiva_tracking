import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(["Admin"]);

    const url = new URL(req.url);
    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setDate(defaultFrom.getDate() - 30);

    const from = url.searchParams.get("from")
      ? new Date(url.searchParams.get("from")!)
      : defaultFrom;
    const to = url.searchParams.get("to")
      ? new Date(url.searchParams.get("to")! + "T23:59:59.999Z")
      : now;
    const search = url.searchParams.get("search") || "";

    // Base where clause for orders in the date range
    const dateFilter = { createdAt: { gte: from, lte: to } };
    const searchFilter = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { client: { contains: search, mode: 'insensitive' as const } },
            { id: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const baseWhere = { ...dateFilter, ...searchFilter };

    // --- KPIs ---
    const [activeCount, completedCount, overdueCount, revenueAgg, laborCostAgg] =
      await Promise.all([
        prisma.order.count({ where: { ...baseWhere, status: "active" } }),
        prisma.order.count({ where: { ...baseWhere, status: "completed" } }),
        prisma.order.count({
          where: {
            status: "active",
            dueDate: { not: null, lt: now },
          },
        }),
        prisma.order.aggregate({
          where: baseWhere,
          _sum: { price: true },
        }),
        prisma.order.aggregate({
          where: baseWhere,
          _sum: { totalCost: true },
        }),
      ]);

    const totalRevenue = revenueAgg._sum.price || 0;
    const totalLaborCost = laborCostAgg._sum.totalCost || 0;
    const laborMargin = totalRevenue - totalLaborCost;
    const laborMarginPercent =
      totalRevenue > 0 ? Math.round((laborMargin / totalRevenue) * 1000) / 10 : 0;

    // Avg completion days
    const completedOrders = await prisma.order.findMany({
      where: { ...baseWhere, status: "completed", completedAt: { not: null } },
      select: { createdAt: true, completedAt: true },
    });
    const avgCompletionDays =
      completedOrders.length > 0
        ? Math.round(
            (completedOrders.reduce((sum, o) => {
              const days =
                (new Date(o.completedAt!).getTime() - new Date(o.createdAt).getTime()) /
                (1000 * 60 * 60 * 24);
              return sum + days;
            }, 0) /
              completedOrders.length) *
              10
          ) / 10
        : 0;

    // --- Stage Breakdown ---
    const [stageQueueGroups, stageTimeGroups, allStages] = await Promise.all([
      prisma.order.groupBy({
        by: ["stageId"],
        where: { status: "active" },
        _count: { id: true },
      }),
      prisma.timeEntry.groupBy({
        by: ["stageId"],
        where: {
          isActive: false,
          order: baseWhere,
        },
        _sum: { duration: true, cost: true },
      }),
      prisma.stage.findMany({ orderBy: { position: "asc" } }),
    ]);

    const stageBreakdown = allStages.map((stage) => {
      const queue = stageQueueGroups.find((g) => g.stageId === stage.id);
      const time = stageTimeGroups.find((g) => g.stageId === stage.id);
      return {
        stageId: stage.id,
        name: stage.name,
        type: stage.type,
        orderCount: queue?._count.id || 0,
        totalTime: time?._sum.duration || 0,
        totalCost: time?._sum.cost || 0,
      };
    });

    // --- Worker Utilization ---
    const [workerTimeGroups, allWorkers] = await Promise.all([
      prisma.timeEntry.groupBy({
        by: ["userId"],
        where: {
          isActive: false,
          order: baseWhere,
        },
        _sum: { duration: true, cost: true },
        _count: { orderId: true },
      }),
      prisma.user.findMany({ where: { role: "Worker" } }),
    ]);

    const workerUtilization = allWorkers
      .map((worker) => {
        const group = workerTimeGroups.find((g) => g.userId === worker.id);
        return {
          userId: worker.id,
          login: worker.login,
          totalTime: group?._sum.duration || 0,
          totalCost: group?._sum.cost || 0,
          orderCount: group?._count.orderId || 0,
          hourlyRate: worker.hourlyRate,
        };
      })
      .sort((a, b) => b.totalTime - a.totalTime);

    // --- Top Categories ---
    const categoryGroups = await prisma.order.groupBy({
      by: ["categoryId"],
      where: baseWhere,
      _count: { id: true },
      _sum: { price: true },
    });
    const allCategories = await prisma.category.findMany();
    const topCategories = categoryGroups
      .map((g) => ({
        categoryId: g.categoryId,
        name: allCategories.find((c) => c.id === g.categoryId)?.name || g.categoryId,
        orderCount: g._count.id,
        revenue: g._sum.price || 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // --- Top Clients (top 10) ---
    const clientGroups = await prisma.order.groupBy({
      by: ["client"],
      where: baseWhere,
      _count: { id: true },
      _sum: { price: true },
    });
    const topClients = clientGroups
      .map((g) => ({
        client: g.client,
        orderCount: g._count.id,
        revenue: g._sum.price || 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // --- Overdue Orders ---
    const overdueOrdersList = await prisma.order.findMany({
      where: {
        status: "active",
        dueDate: { not: null, lt: now },
      },
      select: {
        id: true,
        name: true,
        client: true,
        dueDate: true,
        stage: { select: { name: true } },
      },
      orderBy: { dueDate: "asc" },
    });

    const overdueOrders = overdueOrdersList.map((o) => ({
      id: o.id,
      name: o.name,
      client: o.client,
      dueDate: o.dueDate!.toISOString().split("T")[0],
      stageName: o.stage.name,
      daysOverdue: Math.floor(
        (now.getTime() - new Date(o.dueDate!).getTime()) / (1000 * 60 * 60 * 24)
      ),
    }));

    // --- Trends (daily buckets) ---
    const trendOrders = await prisma.order.findMany({
      where: baseWhere,
      select: { createdAt: true, completedAt: true, price: true, status: true },
    });

    const dayMap = new Map<
      string,
      { created: number; completed: number; revenue: number }
    >();
    // Initialize all days in range
    const cursor = new Date(from);
    while (cursor <= to) {
      const key = cursor.toISOString().split("T")[0];
      dayMap.set(key, { created: 0, completed: 0, revenue: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    // Fill with data
    for (const order of trendOrders) {
      const createdKey = new Date(order.createdAt).toISOString().split("T")[0];
      const entry = dayMap.get(createdKey);
      if (entry) {
        entry.created++;
        entry.revenue += order.price;
      }
      if (order.completedAt) {
        const completedKey = new Date(order.completedAt).toISOString().split("T")[0];
        const cEntry = dayMap.get(completedKey);
        if (cEntry) {
          cEntry.completed++;
        }
      }
    }

    const trends = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }));

    return jsonResponse({
      period: {
        from: from.toISOString().split("T")[0],
        to: to.toISOString().split("T")[0],
      },
      kpis: {
        activeOrders: activeCount,
        completedOrders: completedCount,
        overdueOrders: overdueCount,
        totalRevenue,
        totalLaborCost,
        laborMargin,
        laborMarginPercent,
        avgCompletionDays,
      },
      stageBreakdown,
      workerUtilization,
      topCategories,
      topClients,
      overdueOrders,
      trends,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return errorResponse(message, message === "Unauthorized" || message === "Forbidden" ? 403 : 500);
  }
}
