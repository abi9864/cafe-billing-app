# Cafe Billing App

Cafe Billing App is a full-stack, multi-location Point-of-Sale and business management system designed for cafes and restaurants. It handles the complete order-to-payment lifecycle, inventory tracking, staff management, loyalty programs, and business analytics — all from a single web interface.

> **Status:** Fully operational. Backend API on port 5000 · React frontend on port 3000 · PostgreSQL initialized with Cafe Billing App demo data.

## Key Features

### 🛒 Point of Sale
- Fast menu browsing with category filters
- Cart management with variants
- Dine-in / Takeaway / Delivery order types
- Promo code discounts
- Multi-method payments (Cash / Card / Mobile)
- Change calculation for cash
- Printable receipts

### 📦 Operations
- Live order status tracking (Pending → Confirmed → Preparing → Ready → Completed)
- Collect payment from Orders page for dine-in workflows
- Inventory management with reorder alerts
- Shift open/close management
- Supplier management
- Loyalty points program
- Audit logging

### 📊 Analytics
- Real-time dashboard KPIs (revenue, active orders, low stock)
- Revenue charts (daily / weekly / monthly)
- Top-selling item reports
- Payment method breakdown
- Tax / GST reports

### 🏢 Administration
- Multi-location (branch) support
- 5-tier role-based access control (Admin, Manager, Cashier, Chef, Staff)
- User account management
- Menu & category CRUD with images
- Tax rates and discount configuration

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- PostgreSQL 14+ (local install)
- Git

### Setup

```bash
# 1. Clone repository
git clone https://github.com/abi9864/cafe-billing-app.git
cd cafe-billing-app

# 2. Initialize database (PostgreSQL must be running)
psql -U postgres -c "CREATE DATABASE cafe_billing;"
psql -U postgres -d cafe_billing -f database/schema.sql
psql -U postgres -d cafe_billing -f database/seeds.sql

# 3. Start Backend (Terminal 1)
cd backend
npm install
cp .env.example .env.local   # set DB_PASSWORD in .env.local
npm run dev                   # runs on http://localhost:5000

# 4. Start Frontend (Terminal 2)
cd frontend
npm install
npm run dev                   # runs on http://localhost:3000
```

### Access
| URL | Purpose |
|-----|---------|
| http://localhost:3000 | Frontend (React app) |
| http://localhost:5000 | Backend API |
| http://localhost:5000/health | API health check |

## 📊 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Redux Toolkit, TanStack Query v5, Tailwind CSS, Recharts |
| Backend | Node.js, Express 4, JWT, bcryptjs, Helmet, express-rate-limit |
| Database | PostgreSQL 14+, node-postgres (pg) |
| Tooling | nodemon, ESLint, date-fns, Lucide React |

## 📝 Demo Users

All users have password: `password123`

| Email | Role |
|-------|------|
| admin@cafe.com | Admin |
| manager1@cafe.com | Manager |
| cashier1@cafe.com | Cashier |
| chef1@cafe.com | Chef |

## 📚 Documentation

Full project setup guide and user manual: [`docs/project-manual.html`](./docs/project-manual.html)

## 📜 License

MIT License
