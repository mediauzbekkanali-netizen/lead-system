// GET /api/status → sayt qaysi rejimda ishlayotganini bildiradi (demo yoki real)
import { jsonResponse, isDemo } from "./lib.mjs";

export default async () => {
  const demo = isDemo();
  return jsonResponse({
    ok: true,
    demo,
    demoCreds: demo
      ? { project: { login: "demo", password: "demo123" }, admin: { password: "admin123" } }
      : null,
  });
};

export const config = { path: "/api/status" };
