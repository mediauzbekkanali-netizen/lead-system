// POST /api/admin/login → admin paneliga kirish (ADMIN_PASSWORD orqali)
import { jsonResponse, readJson, signToken, isDemo, DEMO_ADMIN_PASSWORD } from "./lib.mjs";
import crypto from "node:crypto";

export default async (req) => {
  if (req.method !== "POST") return jsonResponse({ ok: false, error: "Faqat POST" }, 405);

  const { password } = await readJson(req);
  const expected = process.env.ADMIN_PASSWORD || (isDemo() ? DEMO_ADMIN_PASSWORD : "");

  if (!expected) {
    return jsonResponse({ ok: false, error: "ADMIN_PASSWORD sozlanmagan" }, 500);
  }
  const a = Buffer.from(String(password || ""));
  const b = Buffer.from(String(expected));
  const match = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!match) {
    return jsonResponse({ ok: false, error: "Parol noto'g'ri" }, 401);
  }

  const token = signToken({ role: "admin", sub: "admin" }, 60 * 60 * 8);
  return jsonResponse({ ok: true, token });
};

export const config = { path: "/api/admin/login" };
