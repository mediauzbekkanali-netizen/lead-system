// Umumiy backend kutubxonasi (Vercel serverless funksiyalar uchun)
// Tashqi paketlarsiz — faqat Node.js "crypto" va global "fetch".
import crypto from "node:crypto";

// ─────────────────────────────────────────────────────────────
//  CORS + JSON javob yordamchilari
// ─────────────────────────────────────────────────────────────
export function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export function json(res, status, obj) {
  res.status(status).json(obj);
}

export async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  return await new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { resolve({}); }
    });
    req.on("error", () => resolve({}));
  });
}

// ─────────────────────────────────────────────────────────────
//  Parol hash (PBKDF2 — paketsiz)
// ─────────────────────────────────────────────────────────────
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(String(password), salt, 100000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const test = crypto.pbkdf2Sync(String(password), salt, 100000, 32, "sha256").toString("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(test, "hex"));
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
//  JWT (HS256 — paketsiz)
// ─────────────────────────────────────────────────────────────
function b64url(input) {
  return Buffer.from(input).toString("base64")
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function b64urlJson(obj) { return b64url(JSON.stringify(obj)); }

function secret() {
  return process.env.JWT_SECRET || "INSECURE_DEFAULT_CHANGE_ME";
}

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
  try {
    if (!crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected))) return null;
  } catch { return null; }
  let body;
  try { body = JSON.parse(Buffer.from(p, "base64").toString("utf8")); }
  catch { return null; }
  if (body.exp && Math.floor(Date.now() / 1000) > body.exp) return null;
  return body;
}

export function bearer(req) {
  const h = req.headers.authorization || req.headers.Authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

// ─────────────────────────────────────────────────────────────
//  Google Apps Script (Sheets) — ma'lumotlar bazasi
// ─────────────────────────────────────────────────────────────
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
  try { data = JSON.parse(text); }
  catch { throw new Error(`GAS noto'g'ri javob berdi (${res.status})`); }
  if (data.ok === false) throw new Error(data.error || "GAS xatolik");
  return data;
}

// ─────────────────────────────────────────────────────────────
//  Facebook Marketing API — aktiv reklamalar + natijalar
// ─────────────────────────────────────────────────────────────
const FB_VERSION = "v21.0";

function datePreset(range) {
  const map = {
    today: "today",
    yesterday: "yesterday",
    last_7d: "last_7d",
    last_14d: "last_14d",
    last_30d: "last_30d",
    this_month: "this_month",
    lifetime: "maximum",
  };
  return map[range] || "last_7d";
}

// Facebook "actions" massividan tushunarli natijalarni ajratamiz
function extractResults(insights) {
  const out = {
    results: 0,
    resultLabel: "Natija",
    leads: 0,
    messaging: 0,
    purchases: 0,
    linkClicks: 0,
    thruplays: 0,
  };
  if (!insights) return out;

  const actions = insights.actions || [];
  const getAction = (type) => {
    const a = actions.find((x) => x.action_type === type);
    return a ? Number(a.value) : 0;
  };

  out.leads =
    getAction("lead") +
    getAction("onsite_conversion.lead_grouped") +
    getAction("leadgen_grouped") +
    getAction("offsite_conversion.fb_pixel_lead");
  out.messaging =
    getAction("onsite_conversion.messaging_conversation_started_7d") +
    getAction("onsite_conversion.total_messaging_connection");
  out.purchases =
    getAction("purchase") +
    getAction("offsite_conversion.fb_pixel_purchase") +
    getAction("omni_purchase");
  out.linkClicks = getAction("link_click");

  const tp = insights.video_thruplay_watched_actions || [];
  out.thruplays = tp.length ? Number(tp[0].value || 0) : 0;

  // Asosiy natija turini aniqlaymiz (qaysi biri > 0)
  if (out.leads > 0) { out.results = out.leads; out.resultLabel = "Lidlar"; }
  else if (out.messaging > 0) { out.results = out.messaging; out.resultLabel = "Yozishmalar"; }
  else if (out.purchases > 0) { out.results = out.purchases; out.resultLabel = "Xaridlar"; }
  else if (out.linkClicks > 0) { out.results = out.linkClicks; out.resultLabel = "Havola bosishlari"; }
  else { out.results = 0; out.resultLabel = "Natija"; }

  return out;
}

async function fetchAdsForAccount(token, account, range) {
  const acctId = String(account).startsWith("act_") ? String(account) : `act_${account}`;
  const preset = datePreset(range);

  const fields = [
    "name",
    "effective_status",
    "adset{name}",
    "campaign{name,objective}",
    "creative{thumbnail_url,image_url,video_id,object_type}",
    `insights.date_preset(${preset}){impressions,reach,clicks,spend,ctr,cpm,cpc,frequency,actions,video_thruplay_watched_actions}`,
  ].join(",");

  const filtering = encodeURIComponent(
    JSON.stringify([{ field: "effective_status", operator: "IN", value: ["ACTIVE"] }])
  );

  let url =
    `https://graph.facebook.com/${FB_VERSION}/${acctId}/ads` +
    `?fields=${encodeURIComponent(fields)}` +
    `&filtering=${filtering}` +
    `&limit=50&access_token=${encodeURIComponent(token)}`;

  const ads = [];
  let currency = "";
  let pages = 0;

  while (url && pages < 10) {
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) {
      throw new Error(`Facebook: ${data.error.message || "xatolik"} (akkaunt ${acctId})`);
    }
    for (const ad of data.data || []) {
      const ins = (ad.insights && ad.insights.data && ad.insights.data[0]) || null;
      const r = extractResults(ins);
      const spend = ins ? Number(ins.spend || 0) : 0;
      const creative = ad.creative || {};
      ads.push({
        id: ad.id,
        name: ad.name,
        status: ad.effective_status,
        account: acctId,
        campaign: (ad.campaign && ad.campaign.name) || "",
        objective: (ad.campaign && ad.campaign.objective) || "",
        adset: (ad.adset && ad.adset.name) || "",
        isVideo: !!creative.video_id || creative.object_type === "VIDEO",
        thumbnail: creative.thumbnail_url || creative.image_url || "",
        videoId: creative.video_id || "",
        impressions: ins ? Number(ins.impressions || 0) : 0,
        reach: ins ? Number(ins.reach || 0) : 0,
        clicks: ins ? Number(ins.clicks || 0) : 0,
        ctr: ins ? Number(ins.ctr || 0) : 0,
        cpm: ins ? Number(ins.cpm || 0) : 0,
        cpc: ins ? Number(ins.cpc || 0) : 0,
        frequency: ins ? Number(ins.frequency || 0) : 0,
        spend,
        results: r.results,
        resultLabel: r.resultLabel,
        thruplays: r.thruplays,
      });
    }
    url = (data.paging && data.paging.next) || null;
    pages++;
  }

  // Valyutani alohida so'rov bilan olamiz (bir marta)
  try {
    const cRes = await fetch(
      `https://graph.facebook.com/${FB_VERSION}/${acctId}?fields=currency&access_token=${encodeURIComponent(token)}`
    );
    const cData = await cRes.json();
    if (cData && cData.currency) currency = cData.currency;
  } catch { /* valyuta muhim emas */ }

  return { ads, currency };
}

// Akkaunt darajasidagi kunlik trend (grafik uchun) — best-effort
export async function fetchTrend(token, adAccounts, range) {
  const accounts = Array.isArray(adAccounts)
    ? adAccounts
    : String(adAccounts || "").split(",").map((s) => s.trim()).filter(Boolean);
  const preset = datePreset(range);
  const byDate = {};

  for (const acct of accounts) {
    const acctId = String(acct).startsWith("act_") ? String(acct) : `act_${acct}`;
    const url =
      `https://graph.facebook.com/${FB_VERSION}/${acctId}/insights` +
      `?fields=${encodeURIComponent("spend,impressions,actions")}` +
      `&time_increment=1&date_preset=${preset}&limit=90` +
      `&access_token=${encodeURIComponent(token)}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) continue;
      for (const row of data.data || []) {
        const day = row.date_start;
        if (!day) continue;
        if (!byDate[day]) byDate[day] = { date: day, spend: 0, results: 0, impressions: 0 };
        byDate[day].spend += Number(row.spend || 0);
        byDate[day].impressions += Number(row.impressions || 0);
        byDate[day].results += extractResults(row).results;
      }
    } catch { /* trend muhim emas */ }
  }

  return Object.values(byDate).sort((a, b) => (a.date < b.date ? -1 : 1));
}

export async function fetchActiveAds(token, adAccounts, range) {
  const accounts = Array.isArray(adAccounts)
    ? adAccounts
    : String(adAccounts || "").split(",").map((s) => s.trim()).filter(Boolean);

  let all = [];
  let currency = "";
  for (const acct of accounts) {
    const { ads, currency: c } = await fetchAdsForAccount(token, acct, range);
    all = all.concat(ads);
    if (!currency && c) currency = c;
  }

  // Eng ko'p sarflagan reklama tepada
  all.sort((a, b) => b.spend - a.spend);

  const summary = all.reduce(
    (s, ad) => {
      s.activeAds += 1;
      s.spend += ad.spend;
      s.impressions += ad.impressions;
      s.reach += ad.reach;
      s.results += ad.results;
      return s;
    },
    { activeAds: 0, spend: 0, impressions: 0, reach: 0, results: 0 }
  );

  return { ads: all, summary, currency };
}
