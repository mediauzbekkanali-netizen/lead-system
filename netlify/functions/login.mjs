// POST /api/login → loyiha (biznes) o'z login/paroli bilan kiradi
import { jsonResponse, readJson, signToken, verifyPassword, callGas, isDemo, demoLoginProject } from "./lib.mjs";

export default async (req) => {
  if (req.method !== "POST") return jsonResponse({ ok: false, error: "Faqat POST" }, 405);

  const { login, password } = await readJson(req);
  if (!login || !password) {
    return jsonResponse({ ok: false, error: "Login va parol kiriting" }, 400);
  }

  // ── DEMO REJIM ──
  if (isDemo()) {
    const p = demoLoginProject(login, password);
    if (!p) {
      return jsonResponse({ ok: false, error: "Login yoki parol noto'g'ri (demo: demo / demo123)" }, 401);
    }
    const token = signToken({ sub: p.id, login: p.login, name: p.name, role: "project" });
    return jsonResponse({ ok: true, token, project: p });
  }

  try {
    const data = await callGas("getProjectByLogin", { login: String(login).trim() });
    const p = data.project;
    if (!p || !p.id) return jsonResponse({ ok: false, error: "Login yoki parol noto'g'ri" }, 401);
    if (p.active === false || p.active === "FALSE" || p.active === "no") {
      return jsonResponse({ ok: false, error: "Hisob faolsizlantirilgan" }, 403);
    }
    if (!verifyPassword(password, p.passwordHash)) {
      return jsonResponse({ ok: false, error: "Login yoki parol noto'g'ri" }, 401);
    }
    const token = signToken({ sub: p.id, login: p.login, name: p.name, role: "project" });
    return jsonResponse({ ok: true, token, project: { id: p.id, name: p.name, login: p.login } });
  } catch (err) {
    console.error("login xatolik:", err.message);
    return jsonResponse({ ok: false, error: "Server xatoligi, qayta urinib ko'ring" }, 502);
  }
};

export const config = { path: "/api/login" };
