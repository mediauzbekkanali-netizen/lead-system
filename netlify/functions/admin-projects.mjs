// /api/admin/projects → loyihalarni boshqarish (faqat admin)
//   GET               → ro'yxat (parol/token yashirilgan)
//   POST   {project}  → yangi loyiha yaratish
//   PUT    {id,...}   → tahrirlash
//   DELETE ?id=       → o'chirish
import { jsonResponse, readJson, getBearer, query, verifyToken, hashPassword, callGas,
  isDemo, demoListProjects, demoCreateProject, demoUpdateProject, demoDeleteProject } from "./lib.mjs";

function normAccounts(v) {
  if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean).join(",");
  return String(v || "").split(",").map((s) => s.trim()).filter(Boolean).join(",");
}

export default async (req) => {
  const claims = verifyToken(getBearer(req));
  if (!claims || claims.role !== "admin") {
    return jsonResponse({ ok: false, error: "Admin avtorizatsiyasi kerak" }, 401);
  }

  const demo = isDemo();

  try {
    if (req.method === "GET") {
      if (demo) return jsonResponse({ ok: true, projects: demoListProjects(), demo: true });
      const data = await callGas("listProjects");
      return jsonResponse({ ok: true, projects: data.projects || [] });
    }

    if (req.method === "POST") {
      const body = await readJson(req);
      const { name, login, password, fbToken, adAccounts } = body;
      if (!name || !login || !password) {
        return jsonResponse({ ok: false, error: "Nom, login va parol majburiy" }, 400);
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
      if (demo) return jsonResponse({ ok: true, project: demoCreateProject(project), demo: true });
      const data = await callGas("createProject", { project });
      return jsonResponse({ ok: true, project: data.project });
    }

    if (req.method === "PUT") {
      const body = await readJson(req);
      const { id } = body;
      if (!id) return jsonResponse({ ok: false, error: "id majburiy" }, 400);
      const patch = {};
      if (body.name !== undefined) patch.name = String(body.name).trim();
      if (body.login !== undefined) patch.login = String(body.login).trim();
      if (body.password) patch.passwordHash = hashPassword(body.password);
      if (body.fbToken !== undefined && body.fbToken !== "") patch.fbToken = String(body.fbToken).trim();
      if (body.adAccounts !== undefined) patch.adAccounts = normAccounts(body.adAccounts);
      if (body.active !== undefined) patch.active = !!body.active;

      if (demo) return jsonResponse({ ok: true, project: demoUpdateProject(id, patch), demo: true });
      const data = await callGas("updateProject", { id, patch });
      return jsonResponse({ ok: true, project: data.project });
    }

    if (req.method === "DELETE") {
      const id = query(req, "id") || (await readJson(req)).id;
      if (!id) return jsonResponse({ ok: false, error: "id majburiy" }, 400);
      if (demo) { demoDeleteProject(id); return jsonResponse({ ok: true, demo: true }); }
      await callGas("deleteProject", { id });
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ ok: false, error: "Usul qo'llab-quvvatlanmaydi" }, 405);
  } catch (err) {
    console.error("admin/projects xatolik:", err.message);
    return jsonResponse({ ok: false, error: err.message || "Server xatoligi" }, 502);
  }
};

export const config = { path: "/api/admin/projects" };
