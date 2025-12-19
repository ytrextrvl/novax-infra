# NOVAX Infra - البنية التحتية

> مستودع البنية التحتية وDevOps لمنصة NOVAX TRAVEL

---

## ما هو هذا المشروع؟

هذا المستودع يحتوي على:
- تكوينات Cloudflare (DNS, WAF, SSL)
- تكوينات Render (Backend hosting)
- تكوينات Vercel (Frontend hosting)
- سكريبتات DevOps

---

## الهيكل

```
novax-infra/
├── cloudflare/     # DNS, WAF, SSL configs
├── render/         # Backend deployment configs
├── vercel/         # Frontend deployment configs
└── scripts/        # DevOps scripts
```

---

## خطوات التحقق (للمالك غير التقني)

### 1. Cloudflare:
- ادخل dash.cloudflare.com
- تأكد أن novaxtravel.com مُعد

### 2. Render:
- ادخل dashboard.render.com
- تأكد أن الخدمات تعمل

### 3. Vercel:
- ادخل vercel.com/dashboard
- تأكد أن المشاريع منشورة

---

## الملفات المهمة

| الملف | الغرض |
|-------|-------|
| [DEPLOYMENT.md](./DEPLOYMENT.md) | خطوات النشر |
| [SECURITY.md](./SECURITY.md) | سياسات الأمان |
| [CHECKLIST.md](./CHECKLIST.md) | قائمة المهام |

---

> **آخر تحديث:** 2025-12-19
