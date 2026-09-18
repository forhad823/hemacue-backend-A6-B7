# Hemacue Backend

> Blood Donation & Emergency Service Platform — REST API built with **Node.js, TypeScript, Express.js, PostgreSQL, Prisma ORM, Redis, bKash Tokenized Checkout, Cloudinary, JWT**.

Hemacue connects blood donors and patients in Bangladesh. It handles emergency blood requests, smart donor matching (medical blood compatibility + 90-day donation cooldown), premium notification / emergency logistics add-ons paid through **bKash**, full admin administration, audit logging, and a live analytics dashboard.

---

## ✨ Features

### 🔐 Authentication & Users (`/auth`, `/users`)

- Email/password registration with **OTP verification** (Redis + Nodemailer)
- Login issuing JWT **access** (1 day) / **refresh** (7 day) tokens (httpOnly cookies)
- Refresh token rotation, **Google OAuth** sign-in, forgot/reset **password**
- Profile management: update contact/location, availability toggle, blood group, avatar upload (Cloudinary)

### 🩸 Blood Requests (`/blood-requests`)

- Create emergency blood requests (patient, hospital, urgency, needed-by date)
- Public list with **pagination, filtering (blood group / district / urgency / status) and search**
- Update / soft-delete your own requests (creator or admin)

### 🧬 Smart Donor Matching (`/donor-matches`)

- **Medical blood compatibility matrix** (donor → patient group eligibility)
- Finds eligible donors filtered by 90-day cooldown, availability, and excludes already-assigned donors
- Donor **accept / decline** workflow with a guarded status state machine
  `PENDING → VERIFIED → DONOR_ASSIGNED → IN_PROGRESS → COMPLETED` (plus `CANCELLED`)
- Donation history for donors

### 💳 bKash Payments (`/payments`)

- Real **bKash Tokenized Checkout** API (grant/refresh token lifecycle cached in Redis)
- Two paid add-ons: `PREMIUM_NOTIFICATION` fan-out and `EMERGENCY_LOGISTICS` courier dispatch
- **Invoice PDF** (pdfkit) generated in-memory and **emailed** (ejs + Nodemailer) on every successful payment
- **Refund** endpoint for failed logistics dispatch (admin) with full audit trail
- Rate-limited payment initiation (10 req / 15 min / IP)

### 🛡️ Admin Administration (`/admin`)

- List & filter all platform users
- Promote/change roles and **block** users (self-modification guarded)
- **Dashboard analytics**: users by role, requests by status, completed donations, total bKash revenue (computed in parallel)
- **Audit log explorer**: every high-impact action (`STATUS_CHANGE`, `DONOR_ACCEPTED`, `PAYMENT_COMPLETED`, `PAYMENT_REFUNDED`, `USER_BLOCKED`, ...) is recorded and searchable

---

## 🏗️ Project Structure

```text
src/
├── app.ts                      # Express app (cors, helmet-free, json, cookies, routes, error handling)
├── server.ts                   # Bootstrap: DB, Redis, SMTP, HTTP listener
├── app/
│   ├── config/                 # Environment config loader
│   ├── errors/                 # AppError, global handler, Prisma/Zod error mappers
│   ├── lib/                    # prisma, redis, nodemailer, cloudinary, upload, bkash token, invoice
│   ├── middlewares/            # checkAuth (JWT), validateRequest (Zod), rateLimiter (Redis)
│   ├── modules/                # feature modules (one folder per feature)
│   │   ├── auth/               # register, verify-email, login, refresh, google, forgot/reset
│   │   ├── user/               # profile & avatar
│   │   ├── bloodRequest/       # blood request CRUD
│   │   ├── donorMatch/         # matching & status workflow
│   │   ├── payment/            # bKash integration
│   │   └── admin/              # admin, audit, dashboard
│   ├── routes/                 # central router (/api/v1)
│   ├── templates/              # EJS email templates (incl. invoice.ejs)
│   ├── types/                  # Express augmentations
│   └── utils/                  # catchAsync, sendResponse, jwt, seed
prisma/
├── schema/                     # modular schema files (users, blood_requests, ...)
└── migrations/                 # generated SQL migrations
generated/prisma/               # Prisma 7 generated client + enums
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **PostgreSQL** database (or Prisma accelerate/DB `DATABASE_URL`)
- **Redis** instance (upstash/redis.io style `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`)
- A **Gmail** + app password (for Nodemailer), a **Cloudinary** account, a **bKash sandbox** app, and a **Google OAuth** client.

### Installation

```bash
# 1. Clone the repository
git clone <repo-url> hemacue-backend
cd hemacue-backend

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env   # fill in all values (see "Environment Variables")

# 4. Apply database migrations & generate the Prisma client
npx prisma migrate dev
npx prisma generate

# 5. Run the server (development)
npm run dev
```

The API boots on `http://localhost:5000` — health check at `GET /`.

---

## 🧪 Test Accounts (from `.env`)

| Role  | Email                   | Password            |
| ----- | ----------------------- | ------------------- |
| Admin | `testeradmin@gmail.com` | `Tester@admin12345` |
| Donor | `donor-3@gmail.com`     | `Password123!`      |

---

## 📡 API Overview

Base URL: `http://localhost:5000/api/v1`

| #   | Method | Endpoint                           | Access         | Description                               |
| --- | ------ | ---------------------------------- | -------------- | ----------------------------------------- |
| 1   | POST   | `/auth/register`                   | Public         | Register donor/patient (sends OTP)        |
| 2   | POST   | `/auth/verify-email`               | Auth           | Verify OTP → tokens + profile             |
| 3   | POST   | `/auth/login`                      | Public         | Login → JWT pair                          |
| 4   | POST   | `/auth/refresh-token`              | Public         | Rotate refresh token                      |
| 5   | POST   | `/auth/google-login`               | Public         | Google OAuth sign-in                      |
| 6   | POST   | `/auth/forgot-password`            | Auth           | Send reset OTP                            |
| 7   | POST   | `/auth/reset-password`             | Auth           | Set new password with OTP                 |
| 8   | GET    | `/users/me`                        | Authenticated  | Current profile                           |
| 9   | PATCH  | `/users/me`                        | Authenticated  | Update profile/location/availability      |
| 10  | PATCH  | `/users/me/avatar`                 | Authenticated  | Upload avatar (multipart `avatar`)        |
| 11  | POST   | `/blood-requests`                  | PATIENT, ADMIN | Create request                            |
| 12  | GET    | `/blood-requests`                  | Public         | List + paginate + filter + search         |
| 13  | GET    | `/blood-requests/my-requests`      | PATIENT, ADMIN | My requests                               |
| 14  | GET    | `/blood-requests/:id`              | Public         | Request detail (+ requester, assignments) |
| 15  | PATCH  | `/blood-requests/:id`              | Creator, ADMIN | Update request                            |
| 16  | DELETE | `/blood-requests/:id`              | Creator, ADMIN | Soft-delete request                       |
| 17  | GET    | `/donor-matches/compatible-donors` | PATIENT, ADMIN | Search compatible donors                  |
| 18  | POST   | `/blood-requests/:id/respond`      | DONOR          | Accept/decline a match                    |
| 19  | PATCH  | `/blood-requests/:id/status`       | PATIENT, ADMIN | Transition request status                 |
| 20  | GET    | `/donor-matches/my-donations`      | DONOR          | Donation history                          |
| 21  | POST   | `/payments/initiate`               | PATIENT, ADMIN | Initiate bKash payment (r.limited)        |
| 22  | POST   | `/payments/execute`                | PATIENT, ADMIN | Verify + complete payment (r.limited)     |
| 23  | POST   | `/payments/refund/:requestId`      | ADMIN          | Refund failed logistics payment           |
| 24  | GET    | `/payments/:id`                    | PATIENT, ADMIN | Payment transaction detail                |
| 25  | GET    | `/admin/users`                     | ADMIN          | List/filter platform users                |
| 26  | PATCH  | `/admin/users/:id/role`            | ADMIN          | Change role / block user                  |
| 27  | GET    | `/admin/dashboard-stats`           | ADMIN          | System analytics                          |
| 28  | GET    | `/admin/audit-logs`                | ADMIN          | Paginated audit logs                      |
| 29  | POST   | `/donor-matches/assign-donor`      | PATIENT, ADMIN | Assign a Donor for a blood Reqquest       |

> Full request/response bodies, query params, scripts and authorization notes live in **[`API-overview.md`](./API-overview.md)**.

---

## 🔑 Environment Variables

| Variable                                                                                                        | Description                           |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `NODE_ENV`, `PORT`                                                                                              | Runtime environment & port            |
| `DATABASE_URL`                                                                                                  | PostgreSQL connection string          |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`                                                                      | JWT signing secrets                   |
| `JWT_ACCESS_EXPIRES_IN` (1d) / `JWT_REFRESH_EXPIRES_IN` (7d)                                                    | Token lifetimes                       |
| `BCRYPT_SALT_ROUNDS`                                                                                            | Password hashing cost                 |
| `BACKEND_URL`, `FRONTEND_URL`                                                                                   | Absolute API URL & CORS origin        |
| `GOOGLE_CLIENT_ID`                                                                                              | Google OAuth client                   |
| `TESTER_ADMIN_*`, `TESTER_USER_*`                                                                               | Seed tester accounts (admin + donor)  |
| `REDIS_USER`, `REDIS_PASSWORD`, `REDIS_HOST`, `REDIS_PORT`                                                      | Redis (rate limit, OTP, bKash tokens) |
| `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_SENDER`                                                                    | Nodemailer SMTP (Gmail app password)  |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`                                          | Avatar uploads                        |
| `BKASH_BASE_URL`, `BKASH_USERNAME`, `BKASH_PASSWORD`, `BKASH_APP_KEY`, `BKASH_APP_SECRET`, `BKASH_CALLBACK_URL` | bKash Tokenized Checkout sandbox/live |

---

## 📜 Scripts

| Script                                | Description                                  |
| ------------------------------------- | -------------------------------------------- |
| `npm run dev`                         | Run with `tsx watch` (hot reload)            |
| `npm run build`                       | Bundle with `tsup` to `dist/`                |
| `npm start`                           | Run the built bundle (`node dist/server.js`) |
| `npm run format:check` / `format:fix` | Biome format                                 |
| `npm run lint:check` / `lint:fix`     | Biome lint                                   |
| `npx prisma migrate dev`              | Apply schema migrations                      |
| `npx prisma generate`                 | Regenerate Prisma client                     |
| `npx prisma studio`                   | Browse the database                          |

---

## 🛡️ Security & Reliability

- **Zod** validation on body / query / params at every route
- **Redis-backed rate limiting**: global (100 req / 15 min / IP) + auth/payment (10 req / 15 min / IP)
- **JWT** access + rotating refresh tokens, httpOnly cookies, role-based authorization
- Passwords hashed with **bcrypt**; secrets never logged
- **Prisma transactions** for multi-step business operations (donor accept, status change, payment execute/refund)
- Payment emails are non-blocking: an email failure is logged to `AuditLog` and never rolls back a successful payment
- Soft deletes (`isDeleted`) on users & blood requests preserved in list queries

---

## 📄 Documentation

- [`ERD-hemacue.md`](./ERD-hemacue.md) — entity relationship model & Postman API notes (per module)
- [`API-overview.md`](./API-overview.md) — exhaustive request/response documentation for every endpoint
