# GarmentFlow ERP

A full-stack garment industry ERP built with **Django 6**, **GraphQL**, **PostgreSQL**, **Next.js 16**, and **Docker Compose**. Designed for private deployment by a single garment business.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, inline styles |
| Backend | Django 6, Graphene-Django (GraphQL API), graphql-jwt |
| Database | PostgreSQL 15 |
| Auth | JWT (`JWT ` prefix) + OTP via Email / SMS / WhatsApp |
| Containerisation | Docker Compose (dev) · docker-compose.prod.yml (prod) |
| Static files | WhiteNoise + Brotli compression |
| Process manager | Gunicorn (production) |
| Push notifications | Firebase Cloud Messaging (FCM) |
| PWA | Web app manifest + service worker (installable on mobile) |

---

## Features

### Authentication & access control
- Unified login: enter username **or** email **or** phone — resolves automatically
- Two modes: password login with Eye/EyeOff toggle, or OTP (channel picker: Email / WhatsApp / SMS)
- Six-digit OTP with 5-attempt lockout and cryptographically secure generation (`secrets` module)
- JWT stored in `localStorage`; 60-second silent background refresh
- Role-based access control enforced on every GraphQL mutation and query

| Role | Access |
|---|---|
| **Super Admin** | Everything including Settings and brand color changes |
| **Admin** | All operational tabs — employees, warehouses, procurement, production, sales |
| **Manager** | All operational tabs except Settings |
| **Store Keeper** | Dashboard, raw cloth, readymade stock, finished goods |
| **Cutting Master** | Dashboard and cutting assignments |
| **Tailor** | Dashboard and stitching jobs |
| **Auditor** | Read-only across all data tabs |

### Sidebar & navigation
- Collapsible sidebar with section grouping; role-filtered — menu items the user cannot access are hidden entirely
- Avatar/name in sidebar footer is clickable → opens My Profile page
- Logout shows a full-page confirmation overlay (blur backdrop); clears tab state on logout so re-login always opens at Dashboard
- Dark mode toggle persisted in `localStorage`
- Mobile: overlay drawer with hamburger button, auto-close on nav tap

### Dashboard
- Live stock-level stats, revenue, order counts
- Low-stock and out-of-stock alert banner with dismiss button (per-session)
- 60-second background data refresh (no visible spinner)

### Procurement
- **Suppliers**: full CRUD with GSTIN, supply type, credit days, WhatsApp
- **Buyers**: full CRUD with buyer type, credit limit, WhatsApp
- **Purchase Orders**: line-item PO with raw cloth and readymade items, receive workflow, status lifecycle

### Inventory
- **Raw Cloth**: batch tracking (category, color, warehouse, meters available, cost/meter)
- **Readymade Stock**: direct stock entry (item type, size, warehouse, quantity, cost)
- **Finished Products**: barcode/SKU generation, printable hang-tags, profit margin display

### Production pipeline
- **Cutting**: assignments from raw cloth batches to cutting masters, piece tracking
- **Stitching**: jobs from cutting assignments to tailors, QC workflow
- **Finished Goods**: convert completed stitching jobs to finished product inventory

### Sales
- **Sales Orders**: line-item orders against finished stock, payment mode (Paid / Credit / Partial)
- **Credit Ledger**: outstanding balances, payment recording, overdue tracking
- **Returns**: buyer and supplier return tracking with condition and status

### Employee management
- Add / edit employees, assign to warehouses, reset passwords
- Role badges with visual color coding
- **My Profile** page: update email/phone, change password (requires current password)

### Settings (Super Admin only)
- App name, subtitle, company name, currency symbol, tax %
- **Brand Colors**: live color picker for primary and accent colors — applies instantly across the whole app, persisted to database, loaded for all users on page load
- SMTP email configuration
- Twilio SMS configuration
- WhatsApp Business API (Meta Graph API)
- Firebase FCM push notification credentials
- OTP expiry and enable/disable toggle

### Notifications
- In-app notification centre with read/unread state and badge count
- Firebase FCM browser push notifications
- Email, WhatsApp, SMS delivery via configurable credentials (stored in database, admin-editable)

### PWA / Mobile
- Installable as a home-screen app on Android and iOS
- Standalone display mode (no browser chrome)
- Service worker with network-first cache strategy and offline fallback

---

## Quick start

```bash
git clone git@github.com:sathishkumar-smart/ware-house.git
cd ware-house
cp backend/.env.temp backend/.env   # fill in real values
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| GraphQL API | http://localhost:8000/graphql/ |
| Django admin | http://localhost:8000/admin/ |

### Create the first Super Admin

```bash
docker compose exec backend python manage.py createsuperuser
```

The Django superuser is automatically mapped to the **Super Admin** role. All further employee accounts should be created through the app (Employees tab → Add employee).

---

## Production deployment

```bash
# On the server
cp backend/.env.temp backend/.env   # fill in real values
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Production overrides (`docker-compose.prod.yml`):
- Backend runs `gunicorn config.wsgi:application`
- `DEBUG=False`, `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS` from env
- Frontend runs `next build && next start`

---

## Environment variables

Copy `backend/.env.temp` to `backend/.env`:

```env
DJANGO_SECRET_KEY=replace-with-a-long-random-secret
DATABASE_URL=postgres://garmentflow:garmentflow@db:5432/garmentflow

# Production
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=yourdomain.com,103.86.177.246
CORS_ALLOWED_ORIGINS=https://yourdomain.com
```

Notification credentials (SMTP, Twilio, WhatsApp, Firebase) are configured from the in-app Settings page by the Super Admin — no redeploy needed.

---

## Project structure

```
ware-house/
├── backend/
│   ├── config/              # Django settings, URLs, Celery
│   └── warehouse/
│       ├── models.py        # All models (single-app design)
│       ├── permissions.py   # require_role() guard
│       ├── selectors.py     # Read-only queries
│       ├── services/        # Business logic layer
│       └── schema/          # GraphQL types, queries, mutations
├── frontend/
│   └── app/
│       ├── page.tsx         # Main SPA shell (sidebar, routing, data)
│       ├── components/
│       │   ├── atoms/       # Reusable UI primitives
│       │   └── organisms/   # Full-page tab components
│       ├── lib/             # GraphQL client, theme, constants, FCM
│       └── globals.css      # CSS custom properties (design tokens)
├── docker-compose.yml
└── docker-compose.prod.yml
```

---

## Database migrations

Migrations run automatically on container start. To run manually:

```bash
docker compose exec backend python manage.py migrate
```

---

## Indian locale

- Currency displayed in ₹ (INR)
- GST / tax percent field on settings
- GSTIN field on supplier and buyer records
- State + city dropdowns (India-specific)
- Timezone: `Asia/Kolkata`
