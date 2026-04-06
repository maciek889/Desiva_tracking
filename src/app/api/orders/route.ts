import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonResponse, errorResponse, generateOrderId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "active";
    const search = url.searchParams.get("search") || "";

    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50")));

    const where: Prisma.OrderWhereInput = { status };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { client: { contains: search } },
        { id: { contains: search } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { stage: true, color: true, category: true, files: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);
    return jsonResponse({ orders, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return errorResponse(message, message === "Unauthorized" ? 401 : 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(["Admin", "Office"]);
    const body = await req.json();
    const { name, price, client, colorId, stageId, categoryId, uwagi, notatki } = body;

    if (!name || price == null || !client || !colorId || !stageId || !categoryId) {
      return errorResponse("Wszystkie pola są wymagane");
    }
    if (typeof name !== "string" || name.length > 200) return errorResponse("Nieprawidłowa nazwa");
    if (typeof client !== "string" || client.length > 200) return errorResponse("Nieprawidłowy klient");
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) return errorResponse("Nieprawidłowa cena");

    const order = await prisma.order.create({
      data: {
        id: generateOrderId(),
        name,
        price: parsedPrice,
        client,
        colorId,
        stageId,
        categoryId,
        uwagi: uwagi || "",
        notatki: notatki || "",
      },
      include: { stage: true, color: true, category: true, files: true },
    });

    return jsonResponse(order, 201);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return errorResponse(message, 500);
  }
}
