# Global Targeting — texnik xulosa

Ko'p-ijarachili (multi-tenant) reklama hisobot paneli. Har biznes o'z
login/paroli bilan kiradi va faqat o'zining aktiv Facebook reklamalarini
ko'radi. Admin (`globaltargeting`) barcha loyihalarni boshqaradi.

## Tuzilma

```
index.html                     — bitta sahifali UI (login + mijoz + admin)
netlify/functions/
  login.mjs                    — POST /api/login (admin yoki loyiha)
  ads.mjs                      — GET  /api/ads (real Facebook, sana oralig'i)
  admin-projects.mjs           — /api/admin/projects (CRUD, faqat admin)
  lib.mjs                      — FB API, JWT, PBKDF2, GAS, sana yordamchilari
google-apps-script.js          — Google Sheets = ma'lumotlar bazasi
netlify.toml, package.json     — Netlify sozlamalari (ESM functions)
```

## Oqim

1. `/api/login` — `globaltargeting`+`ADMIN_PASSWORD` → admin JWT; aks holda
   loyiha login/parol (Sheets) → loyiha JWT.
2. `/api/ads?from&to[&projectId]` — token orqali loyiha aniqlanadi, uning
   Facebook tokeni bilan Graph API (`time_range`) chaqiriladi, aktiv
   reklamalar + kunlik trend + jami ko'rsatkichlar qaytariladi.
3. `/api/admin/projects` — admin loyiha yaratadi/tahrirlaydi: login, parol
   (hash), Facebook token, Ad Account, guruh, holat.

O'rnatish uchun **QOLLANMA.md** ga qarang.
