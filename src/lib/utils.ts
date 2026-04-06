import crypto from "crypto";

export function generateOrderId(): string {
  const bytes = crypto.randomBytes(6);
  const num = bytes.readUIntBE(0, 6) % 900000000000 + 100000000000;
  return String(num);
}

export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}
