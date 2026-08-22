// GET /api/status  → tizim holati (admin paroli o'rnatilganmi)
import { jsonResponse, adminConfigured } from "./lib.mjs";

export default async () => {
  return jsonResponse({ ok: true, adminConfigured: await adminConfigured() });
};

export const config = { path: "/api/status" };
