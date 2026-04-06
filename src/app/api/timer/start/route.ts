import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(["Worker"]);
    const { orderId } = await req.json();
    if (!orderId || typeof orderId !== "string") return errorResponse("orderId jest wymagane");

    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { stage: true } });
    if (!order || order.status !== "active") return errorResponse("Zamówienie nie znalezione", 404);

    const existing = await prisma.timeEntry.findFirst({
      where: { userId: user.id, orderId, isActive: true },
    });
    if (existing) return errorResponse("Timer już aktywny dla tego zamówienia");

    const entry = await prisma.timeEntry.create({
      data: { orderId, stageId: order.stageId, userId: user.id, startedAt: new Date(), isActive: true },
    });
    return jsonResponse(entry, 201);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return errorResponse(message, 500);
  }
}
