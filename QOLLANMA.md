# Global Targeting — o'rnatish qo'llanmasi

Har bir biznes o'z login/paroli bilan kiradi va **faqat o'zining** aktiv
Facebook reklamalarini ko'radi. Admin (`globaltargeting`) barcha loyihalarni
boshqaradi: login/parol, Facebook token va Ad Account biriktiradi.

Arxitektura: **Netlify** (frontend + serverless funksiyalar) + **Google Sheets**
(ma'lumotlar bazasi). Token faqat serverda saqlanadi — brauzerga chiqmaydi.

---

## 1-qadam — Google Sheets (baza)

1. [sheets.google.com](https://sheets.google.com) da yangi jadval oching.
2. **Kengaytmalar → Apps Script** → `google-apps-script.js` faylidagi kodni
   to'liq joylang.
3. Yuqoridagi `ADMIN_SECRET` ni uzun tasodifiy satrga o'zgartiring
   (masalan `openssl rand -hex 24` natijasi). Buni eslab qoling.
4. **Deploy → New deployment → Web app** →
   *Execute as: Me*, *Who has access: Anyone* → **Deploy**.
5. Chiqqan **Web app URL** ni nusxalang (`.../exec` bilan tugaydi).

## 2-qadam — Netlify'ga joylash

**A) Drag-and-drop (eng oson):** `global-targeting.zip` ni yuklab, Netlify
sayt sahifasidagi *Deploys* bo'limiga sudrab tashlang.

**B) GitHub orqali:** repozitoriyani Netlify'ga import qiling (auto-deploy).

## 3-qadam — Muhit sozlamalari (Netlify → Environment variables)

| Kalit | Qiymat |
|-------|--------|
| `GAS_WEBHOOK_URL` | 1-qadamdagi Web app URL |
| `GAS_ADMIN_SECRET` | Apps Script'dagi `ADMIN_SECRET` bilan **bir xil** |
| `JWT_SECRET` | uzun tasodifiy satr |
| `ADMIN_PASSWORD` | admin uchun kuchli parol |

Sozlamalarni qo'ygach — **Redeploy** qiling.

## 4-qadam — Ishlatish

1. Saytga kiring → **Login: `globaltargeting`**, parol: `ADMIN_PASSWORD`.
2. Admin panelda **＋ Yangi loyiha** → biznes nomi, **login**, **parol**,
   **Facebook token**, **Ad Account ID** ni kiriting.
3. Chiqing → o'sha biznes o'zining login/paroli bilan kirsa — faqat o'zining
   reklamalarini ko'radi (istalgan kundan-kungacha hisobot bilan).

---

## Facebook token (System User — tavsiya etiladi)

1. **business.facebook.com → Business Settings → Users → System Users**
2. Yangi System User yarating → reklama akkauntini unga biriktiring
   (*Assign assets → Ad accounts → Manage*).
3. **Generate token** → ruxsatlar: `ads_read`, `read_insights`,
   `business_management` → tokenни nusxalang.
4. Bu tokenni admin panelda o'sha loyihaga qo'ying. System User token
   muddatsiz va xavfsiz.

**Ad Account ID** — Ads Manager'da `act_` dan keyingi raqam. Bir nechta
akkaunt bo'lsa, vergul bilan yozing.

---

## Xavfsizlik

- Parollar PBKDF2 bilan hash qilinadi (Sheets'da ochiq parol saqlanmaydi).
- Facebook token faqat serverda ishlatiladi, hech qachon brauzerga
  yuborilmaydi.
- Sessiyalar JWT bilan imzolanadi (`JWT_SECRET`).
- Har login o'z tokeni → o'z Ad Account'iga bog'langan: loyihalar bir-birining
  ma'lumotini ko'ra olmaydi.
