import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/utils";

export async function GET() {
  try {
    await requireAuth();
    const stages = await prisma.stage.findMany({ orderBy: { position: "asc" } });
    return jsonResponse(stages);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(["Admin"]);
    const { name, nameEn, type } = await req.json();
    if (!name || typeof name !== "string") return errorResponse("Nazwa etapu jest wymagana");
    if (type && !["office", "factory"].includes(type)) return errorResponse("Nieprawidłowy typ etapu");
    const maxPos = await prisma.stage.aggregate({ _max: { position: true } });
    const stage = await prisma.stage.create({
      data: { name, nameEn: nameEn || "", type: type || "factory", position: (maxPos._max.position || 0) + 1 },
    });
    return jsonResponse(stage, 201);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAuth(["Admin"]);
    const { id, name, nameEn, type, position } = await req.json();
    if (!id) return errorResponse("ID jest wymagane");
    if (!name || typeof name !== "string") return errorResponse("Nazwa etapu jest wymagana");
    if (type && !["office", "factory"].includes(type)) return errorResponse("Nieprawidłowy typ etapu");
    const stage = await prisma.stage.update({
      where: { id },
      data: { name, nameEn, type, position },
    });
    return jsonResponse(stage);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAuth(["Admin"]);
    const { id } = await req.json();
    await prisma.stage.delete({ where: { id } });
    return jsonResponse({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return errorResponse(message, 500);
  }
}
