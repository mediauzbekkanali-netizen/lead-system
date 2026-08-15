# Global Targeting — o'rnatish qo'llanmasi

Har bir biznes o'z login/paroli bilan kiradi va **faqat o'zining** aktiv
Facebook reklamalarini ko'radi. Admin (`globaltargeting`) barcha loyihalarni
boshqaradi: login/parol, Facebook token va Ad Account biriktiradi.

**Ma'lumotlar bazasi — Netlify Blobs** (Netlify ichida, tashqi sozlash yo'q).
Google Sheets kerak emas.

---

## 1-qadam — Netlify'ga joylash

**Drag-and-drop:** `global-targeting.zip` ni yuklab, Netlify sayt sahifasidagi
**Deploys** bo'limiga sudrab tashlang. (Yoki repozitoriyani Git orqali import
qiling — auto-deploy.)

## 2-qadam — Muhit sozlamalari (atigi 2 ta)

Netlify'da: **Site configuration → Environment variables → Add a variable**

| Kalit | Qiymat |
|-------|--------|
| `ADMIN_PASSWORD` | admin uchun **kuchli parol** (masalan `Global2026!`) |
| `JWT_SECRET` | uzun tasodifiy satr (masalan `jwt-2026-uzun-tasodifiy-satr`) |

Keyin: **Deploys → Trigger deploy → Deploy site** (sozlamalar shunda ishlaydi).

## 3-qadam — Ishlatish

1. Saytga kiring → **Login: `globaltargeting`**, parol: `ADMIN_PASSWORD`.
2. Admin panelda **＋ Yangi loyiha** → biznes nomi, **login**, **parol**,
   **Facebook token**, **Ad Account ID**.
3. Chiqing → o'sha biznes o'zining login/paroli bilan kirsa — faqat o'zining
   reklamalarini ko'radi (istalgan kundan-kungacha hisobot bilan).

---

## Facebook token (System User — tavsiya)

1. **business.facebook.com → Business Settings → Users → System Users**
2. Yangi System User → reklama akkauntini biriktiring
   (*Assign assets → Ad accounts → Manage*).
3. **Generate token** → ruxsatlar: `ads_read`, `read_insights`,
   `business_management` → tokenni nusxalang.
4. Admin panelda o'sha loyihaga qo'ying. System User token muddatsiz, xavfsiz.

**Ad Account ID** — Ads Manager'da `act_` dan keyingi raqam. Bir nechta
akkaunt bo'lsa, vergul bilan yozing.

---

## Xavfsizlik

- Parollar PBKDF2 bilan hash qilinadi (ochiq parol saqlanmaydi).
- Facebook token faqat serverda ishlatiladi, brauzerga yuborilmaydi.
- Sessiyalar JWT bilan imzolanadi (`JWT_SECRET`).
- Har login o'z tokeni → o'z Ad Account'iga bog'langan: loyihalar bir-birining
  ma'lumotini ko'ra olmaydi.
