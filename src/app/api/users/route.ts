import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/utils";

export async function GET() {
  try {
    await requireAuth(["Admin"]);
    const users = await prisma.user.findMany({
      select: { id: true, login: true, role: true, hourlyRate: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return jsonResponse(users);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(["Admin"]);
    const { login, password, role, hourlyRate } = await req.json();
    if (!login || !password) return errorResponse("Login i hasło są wymagane");
    if (typeof login !== "string" || login.length < 2 || login.length > 50) return errorResponse("Login musi mieć 2-50 znaków");
    if (typeof password !== "string" || password.length < 4) return errorResponse("Hasło musi mieć min. 4 znaki");
    if (role && !["Admin", "Office", "Worker"].includes(role)) return errorResponse("Nieprawidłowa rola");
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { login, password: hashed, role: role || "Worker", hourlyRate: parseFloat(hourlyRate) || 0 },
      select: { id: true, login: true, role: true, hourlyRate: true },
    });
    return jsonResponse(user, 201);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAuth(["Admin"]);
    const { id, login, password, role, hourlyRate } = await req.json();
    const data: Prisma.UserUpdateInput = {};
    if (login) data.login = login;
    if (password) data.password = await bcrypt.hash(password, 10);
    if (role) data.role = role;
    if (hourlyRate !== undefined) data.hourlyRate = parseFloat(hourlyRate) || 0;
    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, login: true, role: true, hourlyRate: true },
    });
    return jsonResponse(user);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAuth(["Admin"]);
    const { id } = await req.json();
    await prisma.user.delete({ where: { id } });
    return jsonResponse({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return errorResponse(message, 500);
  }
}
