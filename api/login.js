// POST /api/login  → loyiha (biznes) o'z login/paroli bilan kiradi
import { setCors, json, readBody, verifyPassword, signToken, callGas, DEMO, demoLoginProject } from "./_lib.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "Faqat POST" });

  const { login, password } = await readBody(req);
  if (!login || !password) {
    return json(res, 400, { ok: false, error: "Login va parol kiriting" });
  }

  // ── DEMO REJIM ──
  if (DEMO) {
    const p = demoLoginProject(login, password);
    if (!p) {
      return json(res, 401, { ok: false, error: "Login yoki parol noto'g'ri (demo: demo / demo123)" });
    }
    const token = signToken({ sub: p.id, login: p.login, name: p.name, role: "project" });
    return json(res, 200, { ok: true, token, project: p });
  }

  try {
    const data = await callGas("getProjectByLogin", { login: String(login).trim() });
    const p = data.project;

    if (!p || !p.id) {
      return json(res, 401, { ok: false, error: "Login yoki parol noto'g'ri" });
    }
    if (p.active === false || p.active === "FALSE" || p.active === "no") {
      return json(res, 403, { ok: false, error: "Hisob faolsizlantirilgan" });
    }
    if (!verifyPassword(password, p.passwordHash)) {
      return json(res, 401, { ok: false, error: "Login yoki parol noto'g'ri" });
    }

    const token = signToken({ sub: p.id, login: p.login, name: p.name, role: "project" });
    return json(res, 200, {
      ok: true,
      token,
      project: { id: p.id, name: p.name, login: p.login },
    });
  } catch (err) {
    console.error("login xatolik:", err.message);
    return json(res, 502, { ok: false, error: "Server xatoligi, qayta urinib ko'ring" });
  }
}
