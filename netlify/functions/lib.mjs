// Umumiy backend kutubxonasi — Netlify Functions (production)
// Tashqi paketlarsiz: Node "crypto" + global "fetch".
import crypto from "node:crypto";

// ─────────────────────────────────────────────────────────────
//  Web Request/Response yordamchilari (Netlify Functions v2)
// ─────────────────────────────────────────────────────────────
export function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
export async function readJson(req) {
  try { return await req.json(); } catch { return {}; }
}
export function getBearer(req) {
  const h = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}
export function query(req, key) {
  try { return new URL(req.url).searchParams.get(key); } catch { return null; }
}

// ─────────────────────────────────────────────────────────────
//  Administrator sozlamalari
//  Admin login = "globaltargeting" (o'zgarmas), parol = env ADMIN_PASSWORD
// ─────────────────────────────────────────────────────────────
export const ADMIN_LOGIN = "globaltargeting";
export function adminPassword() { return process.env.ADMIN_PASSWORD || ""; }

// ─────────────────────────────────────────────────────────────
//  Parol hash (PBKDF2 — paketsiz)
// ─────────────────────────────────────────────────────────────
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(String(password), salt, 100000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}
export function verifyPassword(password, stored) {
  if (!stored || !String(stored).includes(":")) return false;
  const [salt, hash] = String(stored).split(":");
  const test = crypto.pbkdf2Sync(String(password), salt, 100000, 32, "sha256").toString("hex");
  try { return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(test, "hex")); }
  catch { return false; }
}

// ─────────────────────────────────────────────────────────────
//  JWT (HS256 — paketsiz)
// ─────────────────────────────────────────────────────────────
function b64url(input) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function b64urlJson(obj) { return b64url(JSON.stringify(obj)); }
function secret() { return process.env.JWT_SECRET || "INSECURE_DEFAULT_CHANGE_ME"; }

export function signToken(payload, expiresInSec = 60 * 60 * 12) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInSec };
  const data = `${b64urlJson(header)}.${b64urlJson(body)}`;
  const sig = crypto.createHmac("sha256", secret()).update(data).digest("base64")
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${data}.${sig}`;
}
export function verifyToken(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const expected = crypto.createHmac("sha256", secret()).update(`${h}.${p}`).digest("base64")
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  try { if (!crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected))) return null; }
  catch { return null; }
  let body;
  try { body = JSON.parse(Buffer.from(p, "base64").toString("utf8")); } catch { return null; }
  if (body.exp && Math.floor(Date.now() / 1000) > body.exp) return null;
  return body;
}

// ─────────────────────────────────────────────────────────────
//  Google Apps Script (Sheets) — ma'lumotlar bazasi
// ─────────────────────────────────────────────────────────────
export function gasConfigured() { return !!process.env.GAS_WEBHOOK_URL; }
export async function callGas(action, payload = {}) {
  const url = process.env.GAS_WEBHOOK_URL;
  if (!url) throw new Error("GAS_WEBHOOK_URL sozlanmagan");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, secret: process.env.GAS_ADMIN_SECRET, ...payload }),
    redirect: "follow",
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`GAS noto'g'ri javob (${res.status})`); }
  if (data.ok === false) throw new Error(data.error || "GAS xatolik");
  return data;
}

// ─────────────────────────────────────────────────────────────
//  Sana yordamchilari
// ─────────────────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, "0"); }
export function ymd(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
export function parseYmd(s) {
  const p = String(s).split("-");
  const d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  return isNaN(d) ? null : d;
}
export function resolveRange(from, to) {
  let f = from ? parseYmd(from) : null;
  let t = to ? parseYmd(to) : null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (!t) t = today;
  if (!f) { f = new Date(t); f.setDate(t.getDate() - 6); }
  if (f > t) { const x = f; f = t; t = x; }
  return { since: ymd(f), until: ymd(t) };
}

// ─────────────────────────────────────────────────────────────
//  Facebook Marketing API — aktiv reklamalar + natijalar (time_range)
// ─────────────────────────────────────────────────────────────
const FB_VERSION = "v21.0";

function extractResults(insights) {
  const out = { results: 0, resultLabel: "Natija", thruplays: 0 };
  if (!insights) return out;
  const actions = insights.actions || [];
  const get = (type) => { const a = actions.find((x) => x.action_type === type); return a ? Number(a.value) : 0; };
  const leads = get("lead") + get("onsite_conversion.lead_grouped") + get("leadgen_grouped") + get("offsite_conversion.fb_pixel_lead");
  const messaging = get("onsite_conversion.messaging_conversation_started_7d") + get("onsite_conversion.total_messaging_connection");
  const purchases = get("purchase") + get("offsite_conversion.fb_pixel_purchase") + get("omni_purchase");
  const linkClicks = get("link_click");
  const tp = insights.video_thruplay_watched_actions || [];
  out.thruplays = tp.length ? Number(tp[0].value || 0) : 0;
  if (leads > 0) { out.results = leads; out.resultLabel = "Lidlar"; }
  else if (messaging > 0) { out.results = messaging; out.resultLabel = "Yozishmalar"; }
  else if (purchases > 0) { out.results = purchases; out.resultLabel = "Xaridlar"; }
  else if (linkClicks > 0) { out.results = linkClicks; out.resultLabel = "Havola bosishlari"; }
  return out;
}

function acctId(a) { return String(a).startsWith("act_") ? String(a) : `act_${a}`; }
function accountsList(adAccounts) {
  return Array.isArray(adAccounts)
    ? adAccounts.map((s) => String(s).trim()).filter(Boolean)
    : String(adAccounts || "").split(",").map((s) => s.trim()).filter(Boolean);
}

async function fbAdsForAccount(token, account, since, until) {
  const id = acctId(account);
  const tr = encodeURIComponent(JSON.stringify({ since, until }));
  const fields = [
    "name", "effective_status", "adset{name}", "campaign{name,objective}",
    "creative{thumbnail_url,image_url,video_id,object_type}",
    `insights.time_range(${JSON.stringify({ since, until })}){impressions,reach,clicks,spend,ctr,cpm,cpc,frequency,actions,video_thruplay_watched_actions}`,
  ].join(",");
  const filtering = encodeURIComponent(JSON.stringify([{ field: "effective_status", operator: "IN", value: ["ACTIVE"] }]));
  let url = `https://graph.facebook.com/${FB_VERSION}/${id}/ads?fields=${encodeURIComponent(fields)}&filtering=${filtering}&limit=50&access_token=${encodeURIComponent(token)}`;
  const ads = [];
  let currency = "";
  let pages = 0;
  while (url && pages < 10) {
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) throw new Error(`Facebook: ${data.error.message || "xatolik"} (${id})`);
    for (const ad of data.data || []) {
      const ins = (ad.insights && ad.insights.data && ad.insights.data[0]) || null;
      const r = extractResults(ins);
      const cr = ad.creative || {};
      ads.push({
        id: ad.id, name: ad.name, status: ad.effective_status, account: id,
        campaign: (ad.campaign && ad.campaign.name) || "",
        adset: (ad.adset && ad.adset.name) || "",
        isVideo: !!cr.video_id || cr.object_type === "VIDEO",
        thumbnail: cr.thumbnail_url || cr.image_url || "",
        impressions: ins ? Number(ins.impressions || 0) : 0,
        reach: ins ? Number(ins.reach || 0) : 0,
        clicks: ins ? Number(ins.clicks || 0) : 0,
        ctr: ins ? Number(ins.ctr || 0) : 0,
        cpm: ins ? Number(ins.cpm || 0) : 0,
        cpc: ins ? Number(ins.cpc || 0) : 0,
        frequency: ins ? Number(ins.frequency || 0) : 0,
        spend: ins ? Number(ins.spend || 0) : 0,
        results: r.results, resultLabel: r.resultLabel, thruplays: r.thruplays,
      });
    }
    url = (data.paging && data.paging.next) || null;
    pages++;
  }
  try {
    const cRes = await fetch(`https://graph.facebook.com/${FB_VERSION}/${id}?fields=currency&access_token=${encodeURIComponent(token)}`);
    const cData = await cRes.json();
    if (cData && cData.currency) currency = cData.currency;
  } catch { /* valyuta muhim emas */ }
  return { ads, currency };
}

async function fbTrend(token, accounts, since, until) {
  const tr = encodeURIComponent(JSON.stringify({ since, until }));
  const byDate = {};
  for (const acct of accounts) {
    const id = acctId(acct);
    const url = `https://graph.facebook.com/${FB_VERSION}/${id}/insights?fields=${encodeURIComponent("spend,impressions,actions")}&time_increment=1&time_range=${tr}&limit=180&access_token=${encodeURIComponent(token)}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) continue;
      for (const row of data.data || []) {
        const day = row.date_start;
        if (!day) continue;
        if (!byDate[day]) byDate[day] = { date: day, spend: 0, results: 0 };
        byDate[day].spend += Number(row.spend || 0);
        byDate[day].results += extractResults(row).results;
      }
    } catch { /* trend muhim emas */ }
  }
  return Object.values(byDate).sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((x) => {
      const d = new Date(x.date);
      return { label: `${d.getDate()}.${d.getMonth() + 1}`, value: Math.round(x.spend * 100) / 100 };
    });
}

// Loyiha uchun to'liq hisobot: {summary, ads, trend, currency}
export async function fbReport(token, adAccounts, since, until) {
  const accounts = accountsList(adAccounts);
  let ads = [], currency = "";
  for (const acct of accounts) {
    const { ads: a, currency: c } = await fbAdsForAccount(token, acct, since, until);
    ads = ads.concat(a);
    if (!currency && c) currency = c;
  }
  ads.sort((a, b) => b.spend - a.spend);
  const summary = ads.reduce((s, ad) => {
    s.activeAds += 1; s.spend += ad.spend; s.impressions += ad.impressions;
    s.reach += ad.reach; s.results += ad.results; return s;
  }, { activeAds: 0, spend: 0, impressions: 0, reach: 0, results: 0 });
  summary.spend = Math.round(summary.spend * 100) / 100;
  const trend = await fbTrend(token, accounts, since, until).catch(() => []);
  return { summary, ads, trend, currency: currency || "USD" };
}
