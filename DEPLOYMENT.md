# NOVAX Infra - دليل النشر (Deployment Guide)

> **آخر تحديث:** 2025-12-19

## 1. Cloudflare

### DNS Records:
| Type | Name | Content |
|------|------|---------|
| A | @ | Render IP |
| CNAME | www | novaxtravel.com |
| CNAME | api | Render URL |
| CNAME | admin | Vercel URL |

### SSL:
- Mode: Full (Strict)
- Always Use HTTPS: ON

### WAF:
- Rate Limiting: ON
- Bot Fight Mode: ON

## 2. Render

### Backend Service:
- Name: novax-backend
- Type: Docker
- Branch: main
- Auto-Deploy: ON

## 3. Vercel

### Projects:
- novax-travel → novaxtravel.com
- novax-admin → admin.novaxtravel.com

> **آخر تحديث:** 2025-12-19
