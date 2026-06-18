# Wareflow Warehouse System

A full-stack warehouse inventory application built with Django, GraphQL, PostgreSQL, Next.js, and Docker.

## Included workflows

- JWT login and operator registration
- Multi-location warehouses with location-level stock balances
- Employee roles: administrator, warehouse manager, inventory operator, and auditor
- Inventory dashboard with value, stock, low-stock, and damage metrics
- Product catalog with SKU, vendor, location, unit cost, and reorder level
- Vendor directory
- Stock receipt, issue, and adjustment ledger
- Customer and vendor return tracking
- Damaged-product quarantine tracking
- Optional email alert when a product crosses its reorder level
- Vendor replenishment requests with email and management notifications
- Indian currency, GST rate, HSN code, GSTIN, and Asia/Kolkata time
- Django admin for operational support

## Start the application

```bash
docker compose up --build
```

Open:

- Frontend: http://localhost:3000
- GraphQL API: http://localhost:8000/graphql/
- Django admin: http://localhost:8000/admin/

The first frontend screen can create an operator account. To create an admin account:

```bash
docker compose exec backend python manage.py createsuperuser
```

## Email notifications

Copy `backend/.env.temp` to `backend/.env` and provide real SMTP values. Add:

```env
WAREHOUSE_ALERT_EMAIL=inventory@example.com
DJANGO_SECRET_KEY=replace-with-a-long-random-secret
```

The backend sends a low-stock email after a successful stock update moves a product from above its reorder level to at or below it. A mail-delivery failure does not roll back the inventory operation.

## Core data behavior

Every inventory change creates a `StockMovement` containing the previous balance, signed quantity, new balance, operator, reference, notes, and timestamp. Returns and damage reports also create the required stock movement, keeping the available quantity and audit trail consistent.

## Access model

- **Administrator:** all warehouses, employees, configuration, products, vendors, and stock operations
- **Warehouse manager:** assigned warehouses, products, vendors, stock, returns, damage, and replenishment
- **Inventory operator:** assigned warehouse receiving, issuing, returns, and damage operations
- **Auditor:** read-only operational visibility

Public registration creates only the first administrator. Further employee accounts should be created by an administrator.

## Integration status

Email is implemented for low-stock alerts and vendor replenishment. WhatsApp and Instagram are planned as external connectors; this copied repository did not include their previous implementation or credentials.
