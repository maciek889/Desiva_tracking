import { jsonResponse } from "@/lib/utils";

export async function POST() {
  const response = jsonResponse({ ok: true });
  response.headers.set("Set-Cookie", "auth_token=; Path=/; HttpOnly; Max-Age=0");
  return response;
}
