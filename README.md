# �️ SaporiVivi — Full-Stack Food Delivery Platform

**Live Demo:** [vamous-food-delivery-db-system.vercel.app](https://vamous-food-delivery-db-system.vercel.app/)

A full-stack food delivery platform built as a college project, then pushed to production-grade quality. The focus was on database integrity, security architecture, and real-world operational flows — not just a basic CRUD app.

---

## 🛠️ Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React 19, React Router 7, Axios, Tailwind CSS |
| Backend | Node.js, Express 5 |
| Database | MySQL (Aiven cloud), Sequelize ORM |
| Image Storage | Cloudinary (signed uploads) |
| Auth | JWT in httpOnly cookies, bcrypt |
| Logging | Pino, pino-http |
| Deployment | Vercel (frontend), Render (backend), Aiven (MySQL) |

---

## 🧠 Key Engineering Decisions

**Atomic transactions everywhere.**
Checkout creates the order, logs items, clears the cart, records status history, and creates the payment record in a single transaction. Any failure rolls everything back — the database never gets partially updated.

**Race condition prevention.**
Row-level locking (`t.LOCK.UPDATE`) on critical operations. If two drivers accept the same order at the same millisecond, the first gets it and the second gets a clean rejection. Same pattern on payments to prevent double-confirms.

**Order state machine.**
Orders follow a strict state graph: `PENDING → PAID → CONFIRMED → PREPARING → READY → OUT_FOR_DELIVERY → COMPLETED`. Bank transfers add a `PENDING_PAYMENT` step requiring admin confirmation. Invalid transitions are rejected at the service layer, not just in the UI.

**RBAC with four roles.**
`customer`, `restaurant_owner`, `driver`, `admin` — each with scoped access. Customers can't advance order status. Owners can only edit their own restaurants. Drivers can only complete their assigned deliveries. All enforced backend-side.

**Signed Cloudinary uploads.**
Images never upload directly from the browser. The backend signs every upload request, validates ownership (owners can only upload to their own restaurant/menu items), and cleans up old Cloudinary assets when an image is replaced.

**httpOnly cookie auth.**
JWT lives in an httpOnly cookie — not accessible to JavaScript. CORS locked to the deployed frontend origin. Token validated server-side on every protected request.

**16-table normalized schema.**
Users, drivers, addresses, cuisine types, restaurants, restaurant cuisines (M:N), operating hours, menu categories, menu items, payment methods, orders, order items, order status history, payments, reviews, cart items.

---

## 👥 User Roles

| Role | What they can do |
|------|-----------------|
| `customer` | Browse restaurants, add to cart, checkout, track orders, leave reviews |
| `restaurant_owner` | Manage their restaurant info, menu items, images, advance kitchen order states |
| `driver` | Accept ready orders, complete deliveries |
| `admin` | Full system view, approve/reject partner applications, confirm bank transfer payments, deactivate partners |

---

## 🔑 Try It Out

Visit the live link and register a customer account to test the ordering flow.

To see the **Admin Dashboard** with partner management and payment confirmations:

> **Email:** `admin@test.com`
> **Password:** `password123`

To see the **Owner Portal** with menu management and image uploads:

> **Email:** `owner@test.com`
> **Password:** `password123`

---

## 💻 Running Locally

### 1. Clone and install

```bash
git clone https://github.com/vamous-am/vamous-food-delivery-db-system.git
cd vamous-food-delivery-db-system

cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment

Create `backend/.env`:

```env
PORT=5000

# Database (Aiven cloud or local MySQL)
DB_HOST=your_host
DB_PORT=3306
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=your_db

# Auth
JWT_SECRET=your_random_secret_here
JWT_EXPIRES_IN=30d

# Cloudinary (required for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# CORS (update for your frontend URL in production)
FRONTEND_URL=http://localhost:3000
```

### 3. Seed and start

```bash
# Backend (seeds 16 tables with test data)
cd backend
node seed.js
npm run dev       # runs on port 5000

# Frontend (new terminal)
cd frontend
npm start         # runs on port 3000
```

Test credentials after seeding (all use `password123`):

| Email | Role |
|-------|------|
| `customer@test.com` | customer |
| `owner@test.com` | restaurant_owner |
| `driver@test.com` | driver |
| `admin@test.com` | admin |

---

## 📁 Project Structure

```
├── backend/
│   ├── config/          # DB connection, Pino logger
│   ├── controllers/     # Request handlers
│   ├── middleware/       # Auth, upload, validation, error handler
│   ├── models/          # Sequelize models (16 tables + associations)
│   ├── routes/          # Express route definitions
│   ├── services/        # Order state machine
│   ├── utils/           # Response helpers
│   └── seed.js          # Full database seed
│
└── frontend/
    └── src/
        ├── api/         # Axios instance (withCredentials, interceptors)
        ├── components/
        │   ├── common/  # ImageUpload (drag-and-drop, Cloudinary)
        │   ├── layout/  # AppLayout, AuthLayout
        │   └── routes/  # ProtectedRoute, RestrictedRoute
        ├── context/     # AuthContext (centralized auth state)
        ├── hooks/       # useAuth()
        └── pages/
            ├── admin/   # AdminDashboard
            ├── auth/    # Login, Register
            ├── orders/  # Cart, MyOrders, OrderConfirmation
            ├── owner/   # OwnerDashboard
            └── restaurants/ # RestaurantList, Menu
```

---

## 🔌 API Surface

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/auth/register` | None | Sets httpOnly cookie |
| POST | `/api/auth/login` | None | Sets httpOnly cookie |
| POST | `/api/auth/logout` | None | Clears cookie |
| GET | `/api/auth/me` | JWT | |
| GET | `/api/restaurants` | None | Paginated, includes cuisine tags |
| GET | `/api/restaurants/:id/menu` | None | |
| POST | `/api/orders` | JWT | Accepts `payment_method_id` |
| GET | `/api/orders` | JWT | Role-filtered |
| PUT | `/api/orders/:id/status` | JWT | State machine enforced |
| GET | `/api/payments/methods` | JWT | |
| POST | `/api/payments/confirm-transfer/:id` | JWT admin | Bank transfer confirmation |
| POST | `/api/upload/restaurant` | JWT owner/admin | Signed Cloudinary upload |
| POST | `/api/upload/menu-item` | JWT owner/admin | Signed Cloudinary upload |
| PUT | `/api/restaurants/:id` | JWT owner/admin | IDOR ownership check |
| PUT | `/api/menu-items/:id` | JWT owner/admin | Ownership JOIN check |
| POST | `/api/applications/restaurant` | None | Partner onboarding |
| POST | `/api/applications/driver` | None | Driver onboarding |
| GET | `/api/admin/applications` | JWT admin | Pending approvals |
| POST | `/api/admin/applications/:type/:id/approve` | JWT admin | Returns one-time temp password |
| GET | `/api/admin/partners` | JWT admin | Active partner management |
| PATCH | `/api/admin/partners/:type/:id/toggle-active` | JWT admin | Soft deactivation |
