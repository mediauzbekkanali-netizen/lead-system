// /api/admin/projects  → loyihalarni boshqarish (faqat admin)
//   GET               → ro'yxat (parol/token yashirilgan)
//   POST   {project}  → yangi loyiha yaratish
//   PUT    {id,...}   → tahrirlash
//   DELETE ?id=       → o'chirish
import { setCors, json, readBody, verifyToken, bearer, hashPassword, callGas,
  DEMO, demoListProjects, demoCreateProject, demoUpdateProject, demoDeleteProject } from "../_lib.js";

function requireAdmin(req, res) {
  const claims = verifyToken(bearer(req));
  if (!claims || claims.role !== "admin") {
    json(res, 401, { ok: false, error: "Admin avtorizatsiyasi kerak" });
    return null;
  }
  return claims;
}

function normAccounts(v) {
  if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean).join(",");
  return String(v || "").split(",").map((s) => s.trim()).filter(Boolean).join(",");
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!requireAdmin(req, res)) return;

  try {
    if (req.method === "GET") {
      if (DEMO) return json(res, 200, { ok: true, projects: demoListProjects(), demo: true });
      const data = await callGas("listProjects");
      return json(res, 200, { ok: true, projects: data.projects || [] });
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      const { name, login, password, fbToken, adAccounts } = body;
      if (!name || !login || !password) {
        return json(res, 400, { ok: false, error: "Nom, login va parol majburiy" });
      }
      const project = {
        id: "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: String(name).trim(),
        login: String(login).trim(),
        passwordHash: hashPassword(password),
        fbToken: String(fbToken || "").trim(),
        adAccounts: normAccounts(adAccounts),
        active: true,
      };
      if (DEMO) return json(res, 200, { ok: true, project: demoCreateProject(project), demo: true });
      const data = await callGas("createProject", { project });
      return json(res, 200, { ok: true, project: data.project });
    }

    if (req.method === "PUT") {
      const body = await readBody(req);
      const { id } = body;
      if (!id) return json(res, 400, { ok: false, error: "id majburiy" });
      const patch = {};
      if (body.name !== undefined) patch.name = String(body.name).trim();
      if (body.login !== undefined) patch.login = String(body.login).trim();
      if (body.password) patch.passwordHash = hashPassword(body.password); // faqat yangi parol berilsa
      if (body.fbToken !== undefined && body.fbToken !== "") patch.fbToken = String(body.fbToken).trim();
      if (body.adAccounts !== undefined) patch.adAccounts = normAccounts(body.adAccounts);
      if (body.active !== undefined) patch.active = !!body.active;

      if (DEMO) return json(res, 200, { ok: true, project: demoUpdateProject(id, patch), demo: true });
      const data = await callGas("updateProject", { id, patch });
      return json(res, 200, { ok: true, project: data.project });
    }

    if (req.method === "DELETE") {
      const id = (req.query && req.query.id) || (await readBody(req)).id;
      if (!id) return json(res, 400, { ok: false, error: "id majburiy" });
      if (DEMO) { demoDeleteProject(id); return json(res, 200, { ok: true, demo: true }); }
      await callGas("deleteProject", { id });
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { ok: false, error: "Usul qo'llab-quvvatlanmaydi" });
  } catch (err) {
    console.error("admin/projects xatolik:", err.message);
    return json(res, 502, { ok: false, error: err.message || "Server xatoligi" });
  }
}
