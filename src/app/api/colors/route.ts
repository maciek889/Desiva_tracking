import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/utils";

export async function GET() {
  try {
    await requireAuth();
    const colors = await prisma.color.findMany({ orderBy: { name: "asc" } });
    return jsonResponse(colors);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(["Admin"]);
    const { name } = await req.json();
    if (!name || typeof name !== "string") return errorResponse("Nazwa koloru jest wymagana");
    const color = await prisma.color.create({ data: { name } });
    return jsonResponse(color, 201);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAuth(["Admin"]);
    const { id } = await req.json();
    await prisma.color.delete({ where: { id } });
    return jsonResponse({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return errorResponse(message, 500);
  }
}
