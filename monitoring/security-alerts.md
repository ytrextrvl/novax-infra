# تنبيهات الأمان والمراقبة

> **آخر تحديث:** 2025-12-20

---

## التنبيهات المهمة

| التنبيه | المصدر | العتبة | الإجراء |
|---------|--------|--------|---------|
| محاولات تسجيل دخول فاشلة | Backend logs | >10/دقيقة | فحص IP |
| خطأ 500 متكرر | Render/Vercel | >5/دقيقة | فحص الكود |
| استخدام CPU عالي | Render | >80% | توسيع الموارد |
| طلبات مشبوهة | Cloudflare | WAF triggers | مراجعة القواعد |

---

## إعداد التنبيهات

### Render (Backend)
1. Dashboard → Settings → Notifications
2. فعّل: Deploy failures, Health check failures

### Vercel (Frontend)
1. Project Settings → Notifications
2. فعّل: Build failures, Domain issues

### Cloudflare
1. Notifications → Create
2. فعّل: DDoS alerts, WAF events

---

## العتبات الموصى بها

| المقياس | تحذير | حرج |
|---------|-------|-----|
| Response time | >2s | >5s |
| Error rate | >1% | >5% |
| CPU usage | >70% | >90% |

---

> **آخر تحديث:** 2025-12-20
