// =============================================
// GOOGLE APPS SCRIPT — Lead Collector
// =============================================
// Bu scriptni Google Apps Script ga ko'chiring:
// script.google.com → Yangi loyiha → Qo'ying → Deploy

const SHEET_NAME = "Leads"; // Sheet nomi (o'zgartirish mumkin)

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    const name  = (data.name  || "").toString().trim();
    const phone = (data.phone || "").toString().trim();

    if (!name || !phone) {
      return jsonResponse({ success: false, error: "name yoki phone bo'sh" });
    }

    const sheet = getOrCreateSheet(SHEET_NAME);

    // Birinchi marta header qo'shish
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Vaqt", "Ism", "Telefon"]);
      sheet.getRange(1, 1, 1, 3).setFontWeight("bold");
    }

    const timestamp = new Date().toLocaleString("uz-UZ", {
      timeZone: "Asia/Tashkent",
    });

    sheet.appendRow([timestamp, name, phone]);

    return jsonResponse({ success: true });

  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Testlash uchun (ixtiyoriy)
function testDoPost() {
  const fakeEvent = {
    postData: {
      contents: JSON.stringify({ name: "Test User", phone: "+998901234567" }),
    },
  };
  const result = doPost(fakeEvent);
  Logger.log(result.getContent());
}
