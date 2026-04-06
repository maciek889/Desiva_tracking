import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/utils";

export async function GET() {
  try {
    const user = await requireAuth(["Worker"]);
    const active = await prisma.timeEntry.findMany({
      where: { userId: user.id, isActive: true },
      include: { order: true, stage: true },
    });
    return jsonResponse(active);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return errorResponse(message, 500);
  }
}
