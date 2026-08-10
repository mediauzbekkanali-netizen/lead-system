// Umumiy backend kutubxonasi (Netlify serverless funksiyalar uchun)
// Tashqi paketlarsiz — faqat Node.js "crypto" va global "fetch".
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
  try { return await req.json(); }
  catch { return {}; }
}

export function getBearer(req) {
  const h = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

export function query(req, key) {
  try { return new URL(req.url).searchParams.get(key); }
  catch { return null; }
}

// ══════════════════════════════════════════════════════════════
//  DEMO REJIM
//  GAS_WEBHOOK_URL sozlanmagan bo'lsa — avtomatik yoqiladi.
//  Sayt hech qanday sozlamasiz, namuna ma'lumot bilan to'liq ishlaydi.
//  Google Sheets + Facebook token qo'shilishi bilan avtomatik
//  haqiqiy ma'lumotga o'tadi.
// ══════════════════════════════════════════════════════════════
export function isDemo() { return !process.env.GAS_WEBHOOK_URL; }
export const DEMO_ADMIN_PASSWORD = "admin123";
export const DEMO_PROJECT_LOGIN = "demo";
export const DEMO_PROJECT_PASSWORD = "demo123";

let _demoProjects = [
  { id: "demo",    name: "Demo Biznes",  login: "demo",         adAccounts: "9988776655", hasToken: true, tokenMasked: "EAAG…d4Zx", active: true },
  { id: "p_salon", name: "Salon Beauty", login: "salon_beauty", adAccounts: "1234567890", hasToken: true, tokenMasked: "EAAG…a1Bq", active: true },
  { id: "p_gym",   name: "Gym Pro",      login: "gym_pro",      adAccounts: "2233445566", hasToken: true, tokenMasked: "EAAG…9KpL", active: false },
];

export function demoLoginProject(login, password) {
  if (String(login).toLowerCase() === DEMO_PROJECT_LOGIN && String(password) === DEMO_PROJECT_PASSWORD) {
    return { id: "demo", name: "Demo Biznes", login: "demo" };
  }
  return null;
}

export function demoListProjects() { return _demoProjects.map((p) => ({ ...p })); }

export function demoCreateProject(project) {
  const p = {
    id: project.id,
    name: project.name,
    login: project.login,
    adAccounts: project.adAccounts || "",
    hasToken: !!project.fbToken,
    tokenMasked: project.fbToken ? "EAAG…" + String(project.fbToken).slice(-4) : "",
    active: true,
  };
  _demoProjects.push(p);
  return { ...p };
}

export function demoUpdateProject(id, patch) {
  const p = _demoProjects.find((x) => x.id === id);
  if (!p) throw new Error("Loyiha topilmadi");
  if (patch.name !== undefined) p.name = patch.name;
  if (patch.login !== undefined) p.login = patch.login;
  if (patch.adAccounts !== undefined) p.adAccounts = patch.adAccounts;
  if (patch.active !== undefined) p.active = patch.active;
  if (patch.fbToken) { p.hasToken = true; p.tokenMasked = "EAAG…" + String(patch.fbToken).slice(-4); }
  return { ...p };
}

export function demoDeleteProject(id) {
  _demoProjects = _demoProjects.filter((x) => x.id !== id);
}

export function demoAds(range) {
  const scale = ({ today: 0.15, yesterday: 0.18, last_7d: 1, last_14d: 2,
    last_30d: 4.2, this_month: 3.6, lifetime: 9 })[range] || 1;
  const currency = "USD";

  const base = [
    { name: "Qishki chegirma — 50%", campaign: "Konversiya · Lidlar",   adset: "18-45 · Toshkent",  seed: "ad11", isVideo: true,  ctr: 2.34, cpm: 4.10, cpc: 0.18, frequency: 1.8, resultLabel: "Lidlar",     results: 64, spend: 132.5, impressions: 32400, reach: 18200, clicks: 760, thruplays: 9800 },
    { name: "Bepul konsultatsiya",   campaign: "Xabarlar · Messenger",  adset: "25-40 · Ayollar",   seed: "ad12", isVideo: true,  ctr: 3.10, cpm: 3.20, cpc: 0.12, frequency: 1.5, resultLabel: "Yozishmalar", results: 41, spend: 88.0,  impressions: 27500, reach: 15400, clicks: 850, thruplays: 12100 },
    { name: "Yangi kolleksiya 2026",  campaign: "Trafik · Sayt",         adset: "Keng auditoriya",   seed: "ad13", isVideo: true,  ctr: 1.92, cpm: 3.80, cpc: 0.20, frequency: 2.1, resultLabel: "Havola bosishlari", results: 512, spend: 104.3, impressions: 27400, reach: 13000, clicks: 512, thruplays: 8600 },
    { name: "Aksiya: 1+1",           campaign: "Konversiya · Xarid",    adset: "Retarget · 30 kun", seed: "ad14", isVideo: false, ctr: 2.75, cpm: 5.40, cpc: 0.22, frequency: 2.6, resultLabel: "Xaridlar",   results: 23, spend: 76.8,  impressions: 14200, reach: 6100,  clicks: 390, thruplays: 0 },
    { name: "Karusel — mahsulotlar", campaign: "Trafik · Katalog",      adset: "Lookalike 2%",      seed: "ad15", isVideo: false, ctr: 1.48, cpm: 2.90, cpc: 0.19, frequency: 1.4, resultLabel: "Havola bosishlari", results: 305, spend: 58.2,  impressions: 20100, reach: 14300, clicks: 305, thruplays: 0 },
    { name: "Reels — sharh videosi", campaign: "Xabarlar · Instagram",  adset: "18-35 · Reels",     seed: "ad16", isVideo: true,  ctr: 3.62, cpm: 2.60, cpc: 0.10, frequency: 1.3, resultLabel: "Yozishmalar", results: 58, spend: 63.5,  impressions: 24400, reach: 19700, clicks: 883, thruplays: 15600 },
  ];

  const r2 = (n) => Math.round(n * 100) / 100;
  const ads = base.map((a, i) => ({
    id: "23851" + (100000 + i),
    name: a.name,
    status: "ACTIVE",
    account: "act_9988776655",
    campaign: a.campaign,
    objective: "OUTCOME_LEADS",
    adset: a.adset,
    isVideo: a.isVideo,
    thumbnail: `https://picsum.photos/seed/${a.seed}/480/300`,
    videoId: a.isVideo ? "video_" + a.seed : "",
    impressions: Math.round(a.impressions * scale),
    reach: Math.round(a.reach * scale),
    clicks: Math.round(a.clicks * scale),
    ctr: a.ctr,
    cpm: a.cpm,
    cpc: a.cpc,
    frequency: a.frequency,
    spend: r2(a.spend * scale),
    results: Math.round(a.results * scale),
    resultLabel: a.resultLabel,
    thruplays: Math.round(a.thruplays * scale),
  }));

  ads.sort((x, y) => y.spend - x.spend);

  const summary = ads.reduce((s, ad) => {
    s.activeAds += 1;
    s.spend += ad.spend;
    s.impressions += ad.impressions;
    s.reach += ad.reach;
    s.results += ad.results;
    return s;
  }, { activeAds: 0, spend: 0, impressions: 0, reach: 0, results: 0 });
  summary.spend = r2(summary.spend);

  return { ads, summary, currency };
}

export function demoTrend(range) {
  const days = ({ today: 1, yesterday: 1, last_7d: 7, last_14d: 14,
    last_30d: 30, this_month: 30, lifetime: 30 })[range] || 7;
  if (days < 2) return [];
  const out = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const wave = 55 + 35 * Math.sin((i / 3.2)) + (i % 4) * 6;
    const spend = Math.round(wave * 100) / 100;
    const results = Math.round(spend / 2.1);
    out.push({
      date: d.toISOString().slice(0, 10),
      spend,
      results,
      impressions: Math.round(spend * 240),
    });
  }
  return out;
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

function extractResults(insights) {
  const out = { results: 0, resultLabel: "Natija", leads: 0, messaging: 0, purchases: 0, linkClicks: 0, thruplays: 0 };
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

  try {
    const cRes = await fetch(
      `https://graph.facebook.com/${FB_VERSION}/${acctId}?fields=currency&access_token=${encodeURIComponent(token)}`
    );
    const cData = await cRes.json();
    if (cData && cData.currency) currency = cData.currency;
  } catch { /* valyuta muhim emas */ }

  return { ads, currency };
}

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
