# 📊 Reklama Dashboard — O'rnatish qo'llanmasi

Har bir biznes o'z **login/paroli** bilan kirib, faqat **o'z aktiv Facebook
reklamalarini** (qaysi videolar ishlayapti, sarf, natijalar) jonli ko'radi.
Endi qo'lda hisobot yozish va screenshot tashlash shart emas.

## Tizim qanday ishlaydi

```
Biznes  ──login──▶  index.html (dashboard)
                         │  JWT sessiya
                         ▼
                   Vercel  /api/login , /api/ads
                    │                    │
   parol/token ◀────┤ Google Sheets      │ FB token bilan
   o'qish           │ (Apps Script DB)   ▼
                    └──────────▶  Facebook Marketing API (aktiv reklamalar)

Admin  ──parol──▶  admin.html  ──▶  /api/admin/*  ──▶  Google Sheets (loyihalar CRUD)
```

- **Ma'lumotlar bazasi** — Google Sheets (Apps Script orqali). Alohida DB kerak emas.
- **Har mijozning o'z FB tokeni** loyiha bilan birga saqlanadi va faqat server
  tarafida ishlatiladi (brauzerga hech qachon yuborilmaydi).
- **Parollar** PBKDF2 bilan hash qilinadi — ochiq saqlanmaydi.

---

## 1-QADAM — Google Sheets (baza)

1. `sheets.google.com` → yangi jadval oching.
2. `Kengaytmalar → Apps Script`.
3. `google-apps-script.js` faylidagi kodni to'liq ko'chirib qo'ying.
4. Yuqoridagi `ADMIN_SECRET` ni **o'zingizning uzun tasodifiy kalit**ingizga
   o'zgartiring (buni eslab qoling — 3-qadamda kerak).
5. `Deploy → New deployment → Web app`:
   - *Execute as:* Me
   - *Who has access:* **Anyone**
   - `Deploy` → chiqqan **URL** ni nusxalang.

> `Projects` va `Leads` sahifalari birinchi ishlaganda avtomatik yaratiladi.

---

## 2-QADAM — Vercel (backend + sayt)

1. Repozitoriyani Vercel'ga import qiling (`Add New → Project`).
2. **Environment Variables** ga qo'shing (`.env.example` ga qarang):

   | Nomi | Qiymati |
   |------|---------|
   | `GAS_WEBHOOK_URL` | 1-qadamdagi URL |
   | `GAS_ADMIN_SECRET` | 1-qadamdagi `ADMIN_SECRET` bilan **bir xil** |
   | `JWT_SECRET` | uzun tasodifiy satr (`openssl rand -hex 24`) |
   | `ADMIN_PASSWORD` | admin panel paroli |

3. `Deploy` bosing.

---

## 3-QADAM — Loyiha (biznes) qo'shish

1. `https://SIZNING-DOMEN/admin.html` ni oching.
2. `ADMIN_PASSWORD` bilan kiring.
3. **Yangi loyiha** to'ldiring:
   - **Biznes nomi** — mijoz nomi
   - **Login / Parol** — mijoz shu bilan kiradi
   - **Facebook token** — shu biznesning tokeni (pastga qarang)
   - **Ad Account ID** — masalan `1234567890` (vergul bilan bir nechta)
4. `Saqlash`. Mijozga login/parolni bering.

### Facebook token va Ad Account ID ni qayerdan olaman?

- **Ad Account ID:** Ads Manager → yuqori chapda akkaunt tanlash oynasida
  `act_XXXXXXXXX` ko'rinishida. Faqat raqamini kiriting.
- **Token:** [Meta for Developers](https://developers.facebook.com) →
  ilova yarating → **Marketing API** → `ads_read` ruxsati bilan Access Token.
  Uzoq muddatli token yoki **System User** tokeni tavsiya etiladi
  (System User tokeni muddatsiz bo'lishi mumkin).

---

## 4-QADAM — Mijoz kiradi

1. Mijoz `https://SIZNING-DOMEN/` ni ochadi.
2. Login/parol bilan kiradi.
3. O'z **aktiv reklamalarini** ko'radi: video preview, sarf, natija (lid/
   yozishma/xarid), CTR, ko'rsatishlar. Yuqorida davr tanlash (bugun … butun davr).

---

## Fayllar

| Fayl | Vazifasi |
|------|----------|
| `index.html` | Mijoz dashboard (login + aktiv reklamalar) |
| `admin.html` | Admin panel (loyihalarni boshqarish) |
| `lead.html` | Eski lead-forma (saqlab qolindi) |
| `api/login.js` | Mijoz login → JWT |
| `api/ads.js` | Aktiv reklamalarni Facebook'dan olish |
| `api/admin/login.js` | Admin login |
| `api/admin/projects.js` | Loyihalar CRUD |
| `api/_lib.js` | JWT, parol-hash, Sheets va Facebook yordamchilari |
| `api/lead.js` | Eski forma endpointi |
| `google-apps-script.js` | Google Sheets bazasi (Apps Script) |

## Xavfsizlik eslatmasi

Facebook tokenlar Google Sheet ichida saqlanadi (shaxsiy, `ADMIN_SECRET` bilan
himoyalangan). Faqat siz kiradigan jadval bo'lishi kerak. Tokenlarga `ads_read`
kabi eng kam ruxsat bering. Parollar hash qilinadi, ochiq saqlanmaydi.

## Muammolar

| Muammo | Yechim |
|--------|--------|
| Login "server xatoligi" | `GAS_WEBHOOK_URL` va `GAS_ADMIN_SECRET` to'g'ri va **mos** ekanini tekshiring |
| Admin "ADMIN_PASSWORD sozlanmagan" | Vercel'da `ADMIN_PASSWORD` qo'shing va qayta deploy qiling |
| "Facebook: ... xatolik" | Token muddati tugagan yoki `ads_read` yo'q / Ad Account ID noto'g'ri |
| Reklama ko'rinmaydi | Tanlangan davrda **aktiv** reklama yo'q, yoki hammasi pauza |
