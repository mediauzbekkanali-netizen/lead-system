// ==================================================================
// GOOGLE APPS SCRIPT — Ma'lumotlar bazasi (Leadlar + Loyihalar/Projects)
// ==================================================================
// Bu script Google Sheets ni "ma'lumotlar bazasi" sifatida ishlatadi.
//   • Leadlar sahifasi  — eski forma (index/lead.html) uchun (public)
//   • Projects sahifasi — dashboard loyihalari (login, parol-hash, FB token)
//
// O'rnatish:
//   1) sheets.google.com da jadval oching
//   2) Kengaytmalar → Apps Script → shu kodni to'liq qo'ying
//   3) Pastdagi ADMIN_SECRET ni O'ZINGIZNIKIGA o'zgartiring
//      (Vercel dagi GAS_ADMIN_SECRET bilan BIR XIL bo'lishi shart)
//   4) Deploy → Yangi deployment → Web ilovasi → "Hamma (anonim)" → Deploy
//   5) Chiqqan URL ni Vercel dagi GAS_WEBHOOK_URL ga qo'ying
// ==================================================================

// ⚠️ Buni o'zgartiring — Vercel dagi GAS_ADMIN_SECRET bilan bir xil qiling:
const ADMIN_SECRET = "CHANGE_ME_TO_A_LONG_RANDOM_SECRET";

const SHEET_LEADS = "Leads";
const SHEET_PROJECTS = "Projects";
const PROJECT_HEADERS = ["id", "name", "login", "passwordHash", "fbToken", "adAccounts", "group", "active", "createdAt", "updatedAt"];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    // — Public: lead qabul qilish (eski forma bilan mos) —
    if (!action || action === "lead") {
      return handleLead(data);
    }

    // — Himoyalangan: loyiha (Projects) amallari —
    if (String(data.secret || "") !== ADMIN_SECRET) {
      return jsonResponse({ ok: false, error: "unauthorized" });
    }

    switch (action) {
      case "listProjects":     return jsonResponse({ ok: true, projects: listProjects() });
      case "getProjectByLogin":return jsonResponse({ ok: true, project: findProject("login", data.login) });
      case "getProjectById":   return jsonResponse({ ok: true, project: findProject("id", data.id) });
      case "createProject":    return jsonResponse({ ok: true, project: createProject(data.project) });
      case "updateProject":    return jsonResponse({ ok: true, project: updateProject(data.id, data.patch) });
      case "deleteProject":    return jsonResponse({ ok: true, deleted: deleteProject(data.id) });
      default:                 return jsonResponse({ ok: false, error: "unknown action" });
    }
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err && err.message || err) });
  }
}

// ─────────────────────────────────────────────
//  LEADLAR (eski forma)
// ─────────────────────────────────────────────
function handleLead(data) {
  const name  = (data.name  || "").toString().trim();
  const phone = (data.phone || "").toString().trim();
  if (!name || !phone) return jsonResponse({ success: false, error: "name yoki phone bo'sh" });

  const sheet = getOrCreateSheet(SHEET_LEADS);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Vaqt", "Ism", "Telefon"]);
    sheet.getRange(1, 1, 1, 3).setFontWeight("bold");
  }
  const timestamp = new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });
  sheet.appendRow([timestamp, name, phone]);
  return jsonResponse({ success: true });
}

// ─────────────────────────────────────────────
//  LOYIHALAR (Projects) — CRUD
// ─────────────────────────────────────────────
function projectsSheet() {
  const sheet = getOrCreateSheet(SHEET_PROJECTS);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(PROJECT_HEADERS);
    sheet.getRange(1, 1, 1, PROJECT_HEADERS.length).setFontWeight("bold");
  }
  return sheet;
}

function readAllProjects() {
  const sheet = projectsSheet();
  const values = sheet.getDataRange().getValues();
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row[0]) continue; // bo'sh id
    const obj = {};
    PROJECT_HEADERS.forEach((h, idx) => (obj[h] = row[idx]));
    obj._rowIndex = i + 1; // 1-asosli sheet qatori
    obj.active = !(obj.active === false || obj.active === "FALSE" || obj.active === "no" || obj.active === "");
    rows.push(obj);
  }
  return rows;
}

// Admin ro'yxati uchun — sirlarni yashiramiz
function listProjects() {
  return readAllProjects().map((p) => ({
    id: p.id,
    name: p.name,
    login: p.login,
    adAccounts: p.adAccounts,
    group: p.group,
    active: p.active,
    hasToken: !!p.fbToken,
    tokenMasked: p.fbToken ? "••••" + String(p.fbToken).slice(-4) : "",
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
}

// Server (Vercel) uchun — to'liq obyekt (token + hash bilan)
function findProject(field, value) {
  const v = String(value || "").trim().toLowerCase();
  const p = readAllProjects().find((x) => String(x[field] || "").trim().toLowerCase() === v);
  if (!p) return null;
  return {
    id: p.id, name: p.name, login: p.login,
    passwordHash: p.passwordHash, fbToken: p.fbToken,
    adAccounts: p.adAccounts, group: p.group, active: p.active,
  };
}

function createProject(project) {
  const sheet = projectsSheet();
  const now = new Date().toISOString();
  const row = PROJECT_HEADERS.map((h) => {
    if (h === "createdAt" || h === "updatedAt") return now;
    if (h === "active") return project.active === false ? "FALSE" : "TRUE";
    return project[h] !== undefined ? project[h] : "";
  });
  sheet.appendRow(row);
  return { id: project.id, name: project.name, login: project.login };
}

function updateProject(id, patch) {
  const p = readAllProjects().find((x) => String(x.id) === String(id));
  if (!p) throw new Error("loyiha topilmadi");
  const sheet = projectsSheet();
  PROJECT_HEADERS.forEach((h, idx) => {
    let val = null;
    if (h === "updatedAt") val = new Date().toISOString();
    else if (patch && patch[h] !== undefined) {
      val = h === "active" ? (patch[h] ? "TRUE" : "FALSE") : patch[h];
    }
    if (val !== null) sheet.getRange(p._rowIndex, idx + 1).setValue(val);
  });
  return { id: p.id, name: (patch && patch.name) || p.name };
}

function deleteProject(id) {
  const p = readAllProjects().find((x) => String(x.id) === String(id));
  if (!p) return false;
  projectsSheet().deleteRow(p._rowIndex);
  return true;
}

// ─────────────────────────────────────────────
//  Yordamchilar
// ─────────────────────────────────────────────
function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
