# Wareflow — Warehouse Management System

A full-stack warehouse inventory and operations platform built with **Django**, **GraphQL**, **PostgreSQL**, **Next.js 16**, and **Docker Compose**.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Backend | Django 6, Graphene-Django (GraphQL), graphql-jwt |
| Database | PostgreSQL 15 |
| Containerisation | Docker Compose |

---

## Features

### Authentication & roles
- JWT-based login with token stored in `localStorage`
- Five-tier role hierarchy enforced on every API mutation and query:

| Role | Permissions |
|---|---|
| **Super Administrator** | Full access. Cannot be deactivated or edited by regular admins. Only a Super Admin can create or manage other Super Admin accounts. |
| **Administrator** | Warehouses, employees, products, vendors, stock, returns, damage, replenishment, settings |
| **Warehouse Manager** | Assigned warehouses — stock, returns, damage, replenishment |
| **Inventory Operator** | Assigned warehouse — receive, issue, adjust, returns, damage |
| **Auditor** | Read-only visibility |

### Inventory management
- Multi-location warehouses with per-warehouse stock balances
- Product catalogue: SKU, category, vendor, unit price, GST rate, HSN code, reorder level
- Stock movements: receipt, issue, adjustment, customer return, vendor return, damage
- Full audit trail — every change records previous balance, signed quantity, new balance, operator, reference, and timestamp

### Operations
- Customer and vendor return tracking with condition (restockable / damaged)
- Damaged-product quarantine with status lifecycle (Quarantined → Returned / Disposed / Resolved)
- Vendor replenishment requests with status workflow (Draft → Sent → Acknowledged → Partially received → Completed / Cancelled)

### Employee management
- Add, activate/deactivate employees with confirmation dialogs
- Reset any employee's password directly from the UI (Employees tab → Reset password)
- Assign employees to one or more warehouses
- Role badges with visual distinction per tier

### Notifications & alerts
- Low-stock email alert when a product crosses its reorder level
- Vendor replenishment email on request creation
- WhatsApp replenishment notification (requires Twilio credentials)
- In-app notification centre with read/unread state

### Settings & theming
- App name, subtitle, and logo configurable from the Settings tab
- Custom primary and accent brand colours (live preview)
- Dark mode toggle — persisted in `localStorage`
- All theme tokens applied via CSS custom properties; works with dynamic JS overrides

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

### Create the first Super Admin account

```bash
docker compose exec backend python manage.py createsuperuser
```

The `createsuperuser` account is automatically promoted to **Super Administrator** by the database migration. All further employee accounts should be created through the app (Employees tab → Add employee).

---

## Environment variables

Copy `backend/.env.temp` to `backend/.env` and fill in the values:

```env
DJANGO_SECRET_KEY=replace-with-a-long-random-secret
DATABASE_URL=postgres://wareflow:wareflow@db:5432/wareflow

# Email alerts
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=you@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
WAREHOUSE_ALERT_EMAIL=inventory@example.com

# WhatsApp (Twilio) — optional
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=+14155238886
```

A mail-delivery failure does **not** roll back the inventory operation.

---

## Project structure

```
ware-house/
├── backend/
│   ├── config/          # Django settings, URLs, ASGI
│   ├── warehouse/       # Main app — models, schema (GraphQL), services, migrations
│   └── .env.temp        # Environment variable template
├── frontend/
│   └── app/
│       ├── page.tsx     # Entire SPA (dashboard, all tabs, modals)
│       └── globals.css  # Design tokens and component styles
└── docker-compose.yml
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
- GST rate and HSN code fields on every product
- GSTIN field on vendor records
- Timezone: `Asia/Kolkata`
