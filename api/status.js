// GET /api/status  → sayt qaysi rejimda ishlayotganini bildiradi (demo yoki real)
import { setCors, json, DEMO } from "./_lib.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  return json(res, 200, {
    ok: true,
    demo: DEMO,
    // Demo rejimda kirish uchun namuna login ma'lumotlari
    demoCreds: DEMO
      ? { project: { login: "demo", password: "demo123" }, admin: { password: "admin123" } }
      : null,
  });
}
