# 📋 O'rnatish Qo'llanmasi (Uzbekcha)

## Papka Tuzilishi

```
lead-system/
├── index.html              ← Frontend forma
├── api/
│   └── lead.js             ← Vercel serverless endpoint
├── google-apps-script.js   ← Google Sheets skripti
├── vercel.json             ← Vercel konfiguratsiyasi
├── .env.example            ← Muhit o'zgaruvchilari namunasi
└── QOLLANMA.md             ← Shu fayl
```

---

## 1-QADAM: Google Apps Script ni Sozlash

1. **Google Sheets ochish**
   - sheets.google.com → Yangi jadval yarating
   - Nom bering, masalan: `Leadlar`

2. **Apps Script ochish**
   - Jadvalda: `Kengaytmalar → Apps Script`

3. **Kod qo'shish**
   - `Code.gs` fayliga `google-apps-script.js` ichidagi kodni to'liq ko'chiring
   - `Ctrl+S` bilan saqlang

4. **Deploy qilish**
   - Yuqoridan `Deploy → Yangi deployment`
   - Tur: `Web ilovasi`
   - Kimga ruxsat: `Hamma (anonim)`
   - `Deploy` bosing
   - ⚠️ **Manzilni (URL) nusxalab oling** — kerak bo'ladi

---

## 2-QADAM: Vercel ga Deploy Qilish

### Usul A — GitHub orqali (tavsiya etiladi)

1. GitHub da yangi repo yarating
2. `lead-system/` papkasini repo ga yuklang
3. vercel.com → `Add New → Project`
4. GitHub reponi tanlang → `Import`
5. **Environment Variables** bo'limiga:
   - `GAS_WEBHOOK_URL` = GAS deployment URL (1-qadamdan)
6. `Deploy` bosing

### Usul B — Vercel CLI

```bash
npm install -g vercel
cd lead-system
vercel
# So'rovlarga javob bering
vercel env add GAS_WEBHOOK_URL
# GAS URL ni kiriting
vercel --prod
```

---

## 3-QADAM: Frontend ni Ulash

`index.html` faylida bu qatorni toping:

```javascript
const GAS_URL = "YOUR_GAS_WEBHOOK_URL";
```

Agar Vercel ishlatmasangiz va to'g'ridan GAS ga yubormoqchi bo'lsangiz,
bu qatorga GAS URL ni qo'ying.

Agar Vercel ishlatayotgan bo'lsangiz — bu qatorni o'zgartirish shart emas,
chunki forma `/api/lead` ga yuboradi, u yerda URL muhit o'zgaruvchisidan olinadi.

---

## 4-QADAM: Tekshirish

1. Vercel URL ni brauzerda oching
2. Formaga ism va telefon kiriting
3. `Ariza Yuborish` bosing
4. Google Sheets da yangi qator paydo bo'lishi kerak ✅

---

## Muammolar va Yechimlar

| Muammo | Yechim |
|--------|--------|
| GAS 401 xatolik | Deploy → "Hamma" ga ruxsat berilganini tekshiring |
| CORS xatolik | `api/lead.js` da CORS headerlar to'g'ri o'rnatilgan |
| Vercel 502 | `GAS_WEBHOOK_URL` muhit o'zgaruvchisi to'g'ri kiritilganini tekshiring |
| Sheet yangilanmaydi | GAS skriptda `SHEET_NAME` to'g'ri ekanligini tekshiring |
