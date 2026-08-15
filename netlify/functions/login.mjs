// POST /api/login  → BITTA kirish nuqtasi (admin yoki loyiha egasi)
//   login="globaltargeting" + ADMIN_PASSWORD  → admin token
//   loyiha login + parol (Sheets'dan)          → loyiha token
import { jsonResponse, readJson, signToken, verifyPassword, callGas,
  ADMIN_LOGIN, adminPassword, gasConfigured } from "./lib.mjs";
import crypto from "node:crypto";

function safeEq(a, b) {
  const x = Buffer.from(String(a || "")), y = Buffer.from(String(b || ""));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export default async (req) => {
  if (req.method !== "POST") return jsonResponse({ ok: false, error: "Faqat POST" }, 405);
  const { login, password } = await readJson(req);
  if (!login || !password) return jsonResponse({ ok: false, error: "Login va parolni kiriting" }, 400);

  // — Administrator —
  if (String(login).toLowerCase() === ADMIN_LOGIN) {
    const expected = adminPassword();
    if (!expected) return jsonResponse({ ok: false, error: "ADMIN_PASSWORD sozlanmagan (server sozlamasi)" }, 500);
    if (!safeEq(password, expected)) return jsonResponse({ ok: false, error: "Login yoki parol noto'g'ri" }, 401);
    const token = signToken({ role: "admin", sub: "admin" }, 60 * 60 * 8);
    return jsonResponse({ ok: true, role: "admin", token });
  }

  // — Loyiha egasi (mijoz) —
  if (!gasConfigured()) return jsonResponse({ ok: false, error: "Server bazasi (Google Sheets) hali ulanmagan" }, 503);
  try {
    const data = await callGas("getProjectByLogin", { login: String(login).trim() });
    const p = data.project;
    if (!p || !p.id) return jsonResponse({ ok: false, error: "Login yoki parol noto'g'ri" }, 401);
    if (p.active === false) return jsonResponse({ ok: false, error: "Bu hisob nofaol. Administrator bilan bog'laning." }, 403);
    if (!verifyPassword(password, p.passwordHash)) return jsonResponse({ ok: false, error: "Login yoki parol noto'g'ri" }, 401);
    const token = signToken({ role: "project", sub: p.id, name: p.name, login: p.login });
    return jsonResponse({ ok: true, role: "project", token, project: { id: p.id, name: p.name } });
  } catch (err) {
    console.error("login xatolik:", err.message);
    return jsonResponse({ ok: false, error: "Server xatoligi, qayta urinib ko'ring" }, 502);
  }
};

export const config = { path: "/api/login" };
