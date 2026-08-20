// Vercel Serverless Function — /api/lead
// Node.js runtime

const GAS_WEBHOOK_URL = process.env.GAS_WEBHOOK_URL || "https://script.google.com/macros/s/AKfycbwQPEDWngN2xDQ7AsqmqPdb7N4qvNd4J0qwhV6PXVWJxVlz9Xpep3EuhpubKIH_UkXTUQ/exec";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function isValidPhone(phone) {
  return /^[\+]?[\d\s\-\(\)]{9,15}$/.test(phone.trim());
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Faqat POST qabul qilinadi" });
  }

  const { name, phone, mebelType } = req.body || {};

  // --- Validatsiya ---
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return res.status(400).json({ success: false, error: "Ism noto'g'ri yoki bo'sh" });
  }

  if (!phone || !isValidPhone(phone)) {
    return res.status(400).json({ success: false, error: "Telefon raqami noto'g'ri" });
  }

  if (!mebelType || typeof mebelType !== "string" || mebelType.trim().length < 2) {
    return res.status(400).json({ success: false, error: "Mebel turi noto'g'ri yoki bo'sh" });
  }

  const payload = {
    name:      name.trim(),
    phone:     phone.trim(),
    mebelType: mebelType.trim(),
  };

  // --- Google Apps Script ga yuborish ---
  try {
    const gasRes = await fetch(GAS_WEBHOOK_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });

    if (!gasRes.ok) {
      throw new Error(`GAS javob: ${gasRes.status}`);
    }

    return res.status(200).json({ success: true, message: "Ma'lumot saqlandi" });
  } catch (err) {
    console.error("GAS xatolik:", err.message);
    return res.status(502).json({ success: false, error: "Ma'lumot saqlanmadi, qayta urinib ko'ring" });
  }
}
