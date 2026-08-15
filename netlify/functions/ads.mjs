// GET /api/ads?from=YYYY-MM-DD&to=YYYY-MM-DD[&projectId=]  → aktiv reklamalar (real Facebook)
//   loyiha tokeni → o'z ma'lumoti (izolyatsiya)
//   admin tokeni  → ?projectId bilan istalgan loyihani ko'radi
import { jsonResponse, getBearer, query, verifyToken, callGas, fbReport, resolveRange, gasConfigured } from "./lib.mjs";

export default async (req) => {
  if (req.method !== "GET") return jsonResponse({ ok: false, error: "Faqat GET" }, 405);
  const claims = verifyToken(getBearer(req));
  if (!claims) return jsonResponse({ ok: false, error: "Avtorizatsiya kerak" }, 401);

  const { since, until } = resolveRange(query(req, "from"), query(req, "to"));

  // Qaysi loyiha?
  let projectId = claims.sub;
  if (claims.role === "admin") {
    projectId = query(req, "projectId");
    if (!projectId) return jsonResponse({ ok: false, error: "projectId kerak" }, 400);
  } else if (claims.role !== "project") {
    return jsonResponse({ ok: false, error: "Ruxsat yo'q" }, 403);
  }

  if (!gasConfigured()) return jsonResponse({ ok: false, error: "Server bazasi ulanmagan" }, 503);

  try {
    const data = await callGas("getProjectById", { id: projectId });
    const p = data.project;
    if (!p || !p.id) return jsonResponse({ ok: false, error: "Loyiha topilmadi" }, 404);

    const base = { ok: true, project: { id: p.id, name: p.name }, from: since, to: until, updatedAt: new Date().toISOString() };

    // Token yoki akkaunt biriktirilmagan → bo'sh (0) holat
    if (!p.fbToken || !p.adAccounts) {
      return jsonResponse({
        ...base, configured: false,
        summary: { activeAds: 0, spend: 0, impressions: 0, reach: 0, results: 0 },
        trend: [], ads: [], currency: "USD",
        note: !p.fbToken ? "Facebook token biriktirilmagan" : "Reklama akkaunti biriktirilmagan",
      });
    }

    const report = await fbReport(p.fbToken, p.adAccounts, since, until);
    return jsonResponse({ ...base, configured: true, ...report });
  } catch (err) {
    console.error("ads xatolik:", err.message);
    return jsonResponse({ ok: false, error: err.message || "Reklamalarni olishda xatolik" }, 502);
  }
};

export const config = { path: "/api/ads" };
