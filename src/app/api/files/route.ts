import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/utils";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    await requireAuth(["Admin", "Office"]);
    const formData = await req.formData();
    const orderId = formData.get("orderId") as string;
    const file = formData.get("file") as File;

    if (!orderId || !file) return errorResponse("orderId i plik są wymagane");

    // Check file count
    const existingFiles = await prisma.orderFile.count({ where: { orderId } });
    if (existingFiles >= 5) return errorResponse("Maksymalnie 5 plików na zamówienie");

    // Save file
    const uploadDir = path.join(process.cwd(), "public", "uploads", orderId);
    await mkdir(uploadDir, { recursive: true });

    const ext = path.extname(file.name);
    const savedName = `${uuidv4()}${ext}`;
    const filepath = path.join(uploadDir, savedName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    const orderFile = await prisma.orderFile.create({
      data: {
        orderId,
        filename: file.name,
        filepath: `/uploads/${orderId}/${savedName}`,
        mimetype: file.type,
        size: buffer.length,
      },
    });

    return jsonResponse(orderFile, 201);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAuth(["Admin", "Office"]);
    const { fileId } = await req.json();

    const file = await prisma.orderFile.findUnique({ where: { id: fileId } });
    if (!file) return errorResponse("Plik nie znaleziony", 404);

    // Delete physical file from disk
    const physicalPath = path.join(process.cwd(), "public", file.filepath);
    try {
      await unlink(physicalPath);
    } catch {
      // File may already be missing - continue with DB cleanup
    }

    await prisma.orderFile.delete({ where: { id: fileId } });
    return jsonResponse({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return errorResponse(message, 500);
  }
}
