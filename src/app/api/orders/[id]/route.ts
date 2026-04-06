import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/utils";
import path from "path";
import { rm } from "fs/promises";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        stage: true, color: true, category: true, files: true,
        timeEntries: { include: { user: true, stage: true }, orderBy: { createdAt: "desc" } },
      },
    });
    if (!order) return errorResponse("Zamówienie nie znalezione", 404);
    return jsonResponse(order);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(["Admin", "Office"]);
    const { id } = await params;
    const body = await req.json();
    const { name, price, client, colorId, stageId, categoryId, status, uwagi, notatki, dueDate } = body;

    const data: Prisma.OrderUpdateInput = {};
    if (name !== undefined) data.name = name;
    if (price !== undefined) data.price = parseFloat(price);
    if (client !== undefined) data.client = client;
    if (colorId !== undefined) data.color = { connect: { id: colorId } };
    if (stageId !== undefined) data.stage = { connect: { id: stageId } };
    if (categoryId !== undefined) data.category = { connect: { id: categoryId } };
    if (status !== undefined) data.status = status;
    if (uwagi !== undefined) data.uwagi = uwagi;
    if (notatki !== undefined) data.notatki = notatki;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;

    const order = await prisma.order.update({
      where: { id },
      data,
      include: { stage: true, color: true, category: true, files: true },
    });
    return jsonResponse(order);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(["Admin"]);
    const { id } = await params;
    const uploadsDir = path.join(process.cwd(), "public", "uploads", id);
    await rm(uploadsDir, { recursive: true, force: true });
    await prisma.order.delete({ where: { id } });
    return jsonResponse({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return errorResponse(message, 500);
  }
}
