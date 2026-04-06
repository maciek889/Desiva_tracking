import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/utils";

export async function GET() {
  try {
    await requireAuth();
    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
    return jsonResponse(categories);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(["Admin"]);
    const { name } = await req.json();
    if (!name || typeof name !== "string") return errorResponse("Nazwa kategorii jest wymagana");
    const category = await prisma.category.create({ data: { name } });
    return jsonResponse(category, 201);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAuth(["Admin"]);
    const { id, name } = await req.json();
    if (!id) return errorResponse("ID jest wymagane");
    if (!name || typeof name !== "string") return errorResponse("Nazwa kategorii jest wymagana");
    const category = await prisma.category.update({ where: { id }, data: { name } });
    return jsonResponse(category);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAuth(["Admin"]);
    const { id } = await req.json();
    await prisma.category.delete({ where: { id } });
    return jsonResponse({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return errorResponse(message, 500);
  }
}
