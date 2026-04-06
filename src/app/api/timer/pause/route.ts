import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(["Worker"]);
    const { orderId } = await req.json();
    if (!orderId || typeof orderId !== "string") return errorResponse("orderId jest wymagane");

    const entry = await prisma.timeEntry.findFirst({
      where: { userId: user.id, orderId, isActive: true },
    });
    if (!entry) return errorResponse("Brak aktywnego timera");

    const now = new Date();
    const durationMinutes = (now.getTime() - entry.startedAt.getTime()) / 60000;
    const cost = (durationMinutes / 60) * user.hourlyRate;

    const updated = await prisma.timeEntry.update({
      where: { id: entry.id },
      data: { endedAt: now, duration: durationMinutes, cost, isActive: false },
    });
    return jsonResponse(updated);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return errorResponse(message, 500);
  }
}
