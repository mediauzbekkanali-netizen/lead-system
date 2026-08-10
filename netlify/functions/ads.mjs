// GET /api/ads?range=last_7d → kirgan loyihaning AKTIV reklamalari (Facebook'dan jonli)
import { jsonResponse, getBearer, query, verifyToken, callGas, fetchActiveAds, fetchTrend, isDemo, demoAds, demoTrend } from "./lib.mjs";

export default async (req) => {
  if (req.method !== "GET") return jsonResponse({ ok: false, error: "Faqat GET" }, 405);

  const claims = verifyToken(getBearer(req));
  if (!claims || claims.role !== "project") {
    return jsonResponse({ ok: false, error: "Avtorizatsiya kerak" }, 401);
  }

  const range = query(req, "range") || "last_7d";

  // ── DEMO REJIM ──
  if (isDemo()) {
    return jsonResponse({
      ok: true,
      project: { id: "demo", name: "Demo Biznes" },
      range,
      updatedAt: new Date().toISOString(),
      demo: true,
      trend: demoTrend(range),
      ...demoAds(range),
    });
  }

  try {
    const data = await callGas("getProjectById", { id: claims.sub });
    const p = data.project;
    if (!p || !p.id) return jsonResponse({ ok: false, error: "Loyiha topilmadi" }, 404);
    if (!p.fbToken) return jsonResponse({ ok: false, error: "Facebook token biriktirilmagan. Admin bilan bog'laning." }, 400);
    if (!p.adAccounts) return jsonResponse({ ok: false, error: "Reklama akkaunti biriktirilmagan. Admin bilan bog'laning." }, 400);

    const [result, trend] = await Promise.all([
      fetchActiveAds(p.fbToken, p.adAccounts, range),
      fetchTrend(p.fbToken, p.adAccounts, range).catch(() => []),
    ]);
    return jsonResponse({
      ok: true,
      project: { id: p.id, name: p.name },
      range,
      updatedAt: new Date().toISOString(),
      trend,
      ...result,
    });
  } catch (err) {
    console.error("ads xatolik:", err.message);
    return jsonResponse({ ok: false, error: err.message || "Reklamalarni olishda xatolik" }, 502);
  }
};

export const config = { path: "/api/ads" };
