// /api/admin/projects  → loyihalarni boshqarish (faqat admin token)
//   GET               → ro'yxat (parol/token yashirilgan)
//   POST   {project}  → yaratish (login+parol+token o'rnatish)
//   PUT    {id,patch} → tahrirlash (login/parol/token/holat o'zgartirish)
//   DELETE ?id=       → o'chirish
import { jsonResponse, readJson, getBearer, query, verifyToken, hashPassword, callGas } from "./lib.mjs";

function requireAdmin(req) {
  const claims = verifyToken(getBearer(req));
  return claims && claims.role === "admin" ? claims : null;
}
function normAccounts(v) {
  if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean).join(",");
  return String(v || "").split(",").map((s) => s.trim()).filter(Boolean).join(",");
}

export default async (req) => {
  if (!requireAdmin(req)) return jsonResponse({ ok: false, error: "Admin avtorizatsiyasi kerak" }, 401);
  try {
    if (req.method === "GET") {
      const data = await callGas("listProjects");
      return jsonResponse({ ok: true, projects: data.projects || [] });
    }

    if (req.method === "POST") {
      const b = await readJson(req);
      if (!b.name || !b.login || !b.password) return jsonResponse({ ok: false, error: "Nom, login va parol majburiy" }, 400);
      const project = {
        id: "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: String(b.name).trim(),
        login: String(b.login).trim(),
        passwordHash: hashPassword(b.password),
        fbToken: String(b.fbToken || "").trim(),
        adAccounts: normAccounts(b.adAccounts),
        group: String(b.group || "").trim(),
        active: true,
      };
      const data = await callGas("createProject", { project });
      return jsonResponse({ ok: true, project: data.project });
    }

    if (req.method === "PUT") {
      const b = await readJson(req);
      if (!b.id) return jsonResponse({ ok: false, error: "id majburiy" }, 400);
      const patch = {};
      if (b.name !== undefined) patch.name = String(b.name).trim();
      if (b.login !== undefined) patch.login = String(b.login).trim();
      if (b.password) patch.passwordHash = hashPassword(b.password);
      if (b.fbToken !== undefined && b.fbToken !== "") patch.fbToken = String(b.fbToken).trim();
      if (b.adAccounts !== undefined) patch.adAccounts = normAccounts(b.adAccounts);
      if (b.group !== undefined) patch.group = String(b.group).trim();
      if (b.active !== undefined) patch.active = !!b.active;
      const data = await callGas("updateProject", { id: b.id, patch });
      return jsonResponse({ ok: true, project: data.project });
    }

    if (req.method === "DELETE") {
      const id = query(req, "id") || (await readJson(req)).id;
      if (!id) return jsonResponse({ ok: false, error: "id majburiy" }, 400);
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
