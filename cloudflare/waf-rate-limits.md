# Cloudflare WAF و Rate Limiting

> **آخر تحديث:** 2025-12-20

---

## سياسة WAF الأساسية

### القواعد المفعلة:

| القاعدة | الحالة | الإجراء |
|---------|--------|---------|
| OWASP Core Ruleset | مفعل | Block |
| SQL Injection | مفعل | Block |
| XSS | مفعل | Block |
| Bot Management | مفعل | Challenge |

---

## Rate Limiting

### الحدود الموصى بها:

| المسار | الحد | الفترة | الإجراء |
|--------|------|--------|---------|
| /api/auth/login | 10 | دقيقة | Block 10min |
| /api/auth/register | 5 | دقيقة | Block 10min |
| /api/* | 100 | دقيقة | Challenge |
| /* | 1000 | دقيقة | Challenge |

---

## إعداد Rate Limiting

### في Cloudflare Dashboard:

1. Security → WAF → Rate limiting rules
2. Create rule
3. حدد المسار والحد
4. اختر الإجراء

---

## المراقبة

- راجع Cloudflare Analytics أسبوعياً
- فحص blocked requests
- تعديل القواعد حسب الحاجة

---

> **آخر تحديث:** 2025-12-20
