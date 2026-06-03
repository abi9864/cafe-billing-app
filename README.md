# Cafe Billing App - POS System

A comprehensive Point of Sale (POS) and billing management system for cafes with multi-location support, offline functionality, and an intuitive user interface.

## 🚀 Quick Start

### Prerequisites
- Node.js v16+
- Docker & Docker Compose
- Git

### Setup Instructions

```bash
# 1. Clone repository
git clone https://github.com/abi9864/cafe-billing-app.git
cd cafe-billing-app

# 2. Start PostgreSQL
git pull origin main
docker-compose up -d postgres

# 3. Initialize database
docker exec -i cafe_billing_postgres psql -U postgres -d cafe_billing < database/schema.sql
docker exec -i cafe_billing_postgres psql -U postgres -d cafe_billing < database/seeds.sql

# 4. Start Backend (Terminal 1)
cd backend
npm install
cp .env.example .env.local
npm run dev

# 5. Start Frontend (Terminal 2)
cd frontend
npm install
cp .env.example .env.local
npm start
```

### Access Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/health

## 📊 Tech Stack

- **Frontend**: React 18, Redux Toolkit, Tailwind CSS
- **Backend**: Node.js, Express, PostgreSQL
- **Database**: PostgreSQL 14
- **Development**: Docker, npm

## 📚 Documentation

- [Backend Setup](./backend/README.md)
- [Frontend Setup](./frontend/README.md)
- [Database Guide](./database/README.md)
- [Development Guide](./DEVELOPMENT.md)

## 🎯 Features

- ✅ Point of Sale (POS) System
- ✅ Menu Management
- ✅ Multi-location Support
- ✅ Order Management
- ✅ Payment Processing
- ✅ Inventory Tracking
- ✅ Tax Calculations
- ✅ Discounts & Promotions
- ✅ Offline Mode
- ✅ Receipt Printing
- ✅ Reporting & Analytics

## 📝 Default Test Users

All users have password: `password`

| Email | Role |
|-------|------|
| admin@cafe.com | Admin |
| manager1@cafe.com | Manager |
| cashier1@cafe.com | Cashier |
| chef1@cafe.com | Chef |

## 📜 License

MIT License
