// PUT /api/admin/password  → admin parolini o'zgartirish (faqat admin token)
//   {newPassword, currentPassword?}
import { jsonResponse, readJson, getBearer, verifyToken, hashPassword, verifyPassword,
  getAdminHash, setAdminHash } from "./lib.mjs";

export default async (req) => {
  const claims = verifyToken(getBearer(req));
  if (!claims || claims.role !== "admin") return jsonResponse({ ok: false, error: "Admin avtorizatsiyasi kerak" }, 401);
  if (req.method !== "PUT" && req.method !== "POST") return jsonResponse({ ok: false, error: "Faqat PUT" }, 405);

  const { newPassword, currentPassword } = await readJson(req);
  if (!newPassword || String(newPassword).length < 4) {
    return jsonResponse({ ok: false, error: "Yangi parol kamida 4 belgi bo'lsin" }, 400);
  }
  const stored = await getAdminHash();
  if (stored) {
    // Joriy parol tekshiruvi (agar oldindan o'rnatilgan bo'lsa)
    if (!verifyPassword(currentPassword || "", stored)) {
      return jsonResponse({ ok: false, error: "Joriy parol noto'g'ri" }, 401);
    }
  }
  await setAdminHash(hashPassword(newPassword));
  return jsonResponse({ ok: true });
};

export const config = { path: "/api/admin/password" };
