// POST /api/admin/login  → admin paneliga kirish (ADMIN_PASSWORD orqali)
import { setCors, json, readBody, signToken, DEMO, DEMO_ADMIN_PASSWORD } from "../_lib.js";
import crypto from "node:crypto";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "Faqat POST" });

  const { password } = await readBody(req);
  // Demo rejimda ADMIN_PASSWORD sozlanmagan bo'lsa — standart demo parol
  const expected = process.env.ADMIN_PASSWORD || (DEMO ? DEMO_ADMIN_PASSWORD : "");

  if (!expected) {
    return json(res, 500, { ok: false, error: "ADMIN_PASSWORD sozlanmagan" });
  }
  const a = Buffer.from(String(password || ""));
  const b = Buffer.from(String(expected));
  const match = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!match) {
    return json(res, 401, { ok: false, error: "Parol noto'g'ri" });
  }

  const token = signToken({ role: "admin", sub: "admin" }, 60 * 60 * 8);
  return json(res, 200, { ok: true, token });
}
