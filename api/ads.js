// GET /api/ads?range=last_7d  → kirgan loyihaning AKTIV reklamalari (Facebook'dan jonli)
import { setCors, json, verifyToken, bearer, callGas, fetchActiveAds } from "./_lib.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return json(res, 405, { ok: false, error: "Faqat GET" });

  const claims = verifyToken(bearer(req));
  if (!claims || claims.role !== "project") {
    return json(res, 401, { ok: false, error: "Avtorizatsiya kerak" });
  }

  const range = (req.query && req.query.range) || "last_7d";

  try {
    // Loyihaning saqlangan FB tokeni va ad account(lar)ini olamiz (server tarafida)
    const data = await callGas("getProjectById", { id: claims.sub });
    const p = data.project;
    if (!p || !p.id) return json(res, 404, { ok: false, error: "Loyiha topilmadi" });
    if (!p.fbToken) return json(res, 400, { ok: false, error: "Facebook token biriktirilmagan. Admin bilan bog'laning." });
    if (!p.adAccounts) return json(res, 400, { ok: false, error: "Reklama akkaunti biriktirilmagan. Admin bilan bog'laning." });

    const result = await fetchActiveAds(p.fbToken, p.adAccounts, range);
    return json(res, 200, {
      ok: true,
      project: { id: p.id, name: p.name },
      range,
      updatedAt: new Date().toISOString(),
      ...result,
    });
  } catch (err) {
    console.error("ads xatolik:", err.message);
    return json(res, 502, { ok: false, error: err.message || "Reklamalarni olishda xatolik" });
  }
}
