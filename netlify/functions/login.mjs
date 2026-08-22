// POST /api/login  → BITTA kirish nuqtasi (admin yoki loyiha egasi)
//   login="globaltargeting" + ADMIN_PASSWORD  → admin token
//   loyiha login + parol (Sheets'dan)          → loyiha token
import { jsonResponse, readJson, signToken, verifyPassword, hashPassword, projectByLogin,
  ADMIN_LOGIN, adminPassword, getAdminHash, setAdminHash } from "./lib.mjs";
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
    const stored = await getAdminHash();
    let setup = false;
    if (stored) {
      // Parol Blobs'da saqlangan
      if (!verifyPassword(password, stored)) return jsonResponse({ ok: false, error: "Login yoki parol noto'g'ri" }, 401);
    } else if (adminPassword()) {
      // Env orqali bootstrap (ixtiyoriy)
      if (!safeEq(password, adminPassword())) return jsonResponse({ ok: false, error: "Login yoki parol noto'g'ri" }, 401);
    } else {
      // Birinchi kirish — kiritilgan parol o'rnatiladi
      if (String(password).length < 4) return jsonResponse({ ok: false, error: "Admin parol kamida 4 belgi bo'lsin" }, 400);
      await setAdminHash(hashPassword(password));
      setup = true;
    }
    const token = signToken({ role: "admin", sub: "admin" }, 60 * 60 * 8);
    return jsonResponse({ ok: true, role: "admin", token, setup });
  }

  // — Loyiha egasi (mijoz) —
  try {
    const p = await projectByLogin(String(login).trim());
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
