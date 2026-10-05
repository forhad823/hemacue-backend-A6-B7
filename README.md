# Hemacue Backend — Blood Donation & Emergency Logistics Platform

[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.7-blue.svg)](https://www.typescriptlang.org/)
[![Express.js](https://img.shields.io/badge/Express.js-v5.2-lightgrey.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-v7.10-indigo.svg)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v16+-blue.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-v6.2-red.svg)](https://redis.io/)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](https://opensource.org/licenses/ISC)

> Production-ready, enterprise-grade RESTful API built with **Node.js, Express.js (v5), TypeScript, Prisma 7 ORM, PostgreSQL, Redis, bKash Tokenized Checkout, Cloudinary, and Nodemailer**.

Hemacue bridges the gap between emergency blood seekers (patients/hospitals) and life-saving blood donors across Bangladesh. It incorporates **automated medical blood compatibility matrix checking**, strict **90-day donation cooldown enforcement**, **bKash tokenized payment integration** for premium notification fan-outs and emergency courier logistics, automated **PDF invoice generation**, and an **Admin Control Hub with audit logging and live analytics**.

---

## 📑 Table of Contents

- [Key Architecture & Technical Highlights](#-key-architecture--technical-highlights)
- [System Architecture & Module Breakdown](#-system-architecture--module-breakdown)
- [Database ER Schema Overview](#-database-er-schema-overview)
- [Module Features](#-module-features)
  - [🔐 Authentication & User Security](#-authentication--user-security)
  - [👤 Profile & Avatar Management](#-profile--avatar-management)
  - [🩸 Emergency Blood Requests](#-emergency-blood-requests)
  - [🧬 Smart Donor Matching & Workflow](#-smart-donor-matching--workflow)
  - [💳 bKash Payment Integration & PDF Invoicing](#-bkash-payment-integration--pdf-invoicing)
  - [🛡️ Admin Hub, Audit Logging & Analytics](#-admin-hub-audit-logging--analytics)
- [🛠️ Tech Stack & Dependencies](#%EF%B8%8F-tech-stack--dependencies)
- [📁 Project Folder Structure](#-project-folder-structure)
- [🚀 Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation & Setup](#installation--setup)
  - [Database Migration & Seeding](#database-migration--seeding)
  - [Running the Server](#running-the-server)
- [🔐 Environment Variables Reference](#-environment-variables-reference)
- [🧪 Code Quality, Formatting & Building](#-code-quality-formatting--building)
- [📖 API Documentation Reference](#-api-documentation-reference)

---

## 💡 Key Architecture & Technical Highlights

- **Modular Enterprise Architecture**: Organized by domain feature modules (`auth`, `user`, `bloodRequest`, `donorMatch`, `payment`, `admin`) following standard Controller-Service-Validation pattern.
- **Strict Type Safety**: Written 100% in TypeScript with Prisma 7 generated client types and Zod schema validations.
- **Medical Blood Compatibility Logic**: Automated checking of compatible blood types (e.g., `O_NEGATIVE` universal donor, `AB_POSITIVE` universal recipient).
- **Guarded State Machine Workflow**: Request status transitions follow strict rules:
  $$\text{PENDING} \rightarrow \text{VERIFIED} \rightarrow \text{DONOR\_ASSIGNED} \rightarrow \text{IN\_PROGRESS} \rightarrow \text{COMPLETED}$$
- **Tokenized bKash Checkout**: Integrates real bKash sandbox API (`grant-token`, `create`, `execute`, `refund`) with automated token caching in Redis.
- **PDF Invoicing & Mail Delivery**: Generates stream-based PDF invoices using `pdfkit` and renders responsive HTML email templates with `ejs` delivered via `nodemailer`.
- **Comprehensive Audit Trail**: Automatically captures high-impact administrative and donor state modifications (`AuditLog` table).
- **Multi-layer Rate Limiting**: Redis-backed rate limiting protects sensitive endpoints (`/auth/*` and `/payments/*`) against brute-force attacks.

---

## 🏗 System Architecture & Module Breakdown

```mermaid
flowchart TD
    Client[Web / Mobile Client] -->|HTTPS Requests| ExpressApp[Express 5 Server]

    subgraph Middlewares[Middleware Pipeline]
        Cors[CORS / Cookie Parser]
        RL[Redis Rate Limiter]
        AuthGuard[JWT Auth Guard checkAuth]
        ZodVal[Zod Request Validator]
    end

    ExpressApp --> Cors --> RL --> AuthGuard --> ZodVal

    subgraph Modules[Feature Modules]
        AuthMod[Auth Module]
        UserMod[User Module]
        BloodMod[Blood Request Module]
        MatchMod[Donor Match Module]
        PayMod[bKash Payment Module]
        AdminMod[Admin & Analytics Module]
    end

    ZodVal --> Modules

    subgraph ExternalServices[External Infrastructure & Services]
        PG[(PostgreSQL Database - Prisma 7)]
        RD[(Redis Cache / Rate Limiting)]
        bKash[bKash Tokenized Checkout API]
        Cloudinary[Cloudinary CDN]
        SMTP[Nodemailer SMTP Email Service]
    end

    Modules --> PG
    Modules --> RD
    PayMod --> bKash
    UserMod --> Cloudinary
    AuthMod & PayMod --> SMTP
```

---

## 🗄 Database ER Schema Overview

The database uses PostgreSQL managed via Prisma 7 with modular schema definition files:

```mermaid
erDiagram
    User ||--o{ BloodRequest : "creates"
    User ||--o{ DonorMatch : "donates as donor"
    BloodRequest ||--o{ DonorMatch : "receives matches"
    BloodRequest ||--o{ Payment : "has emergency payments"
    User ||--o{ Payment : "initiates payments"
    User ||--o{ AuditLog : "performed by user"

    User {
        string id PK
        string email UK
        string password
        string name
        enum role "DONOR | PATIENT | ADMIN"
        enum bloodGroup
        boolean isAvailable
        datetime lastDonatedAt
        boolean isBlocked
        boolean isVerified
    }

    BloodRequest {
        string id PK
        string requesterId FK
        string patientName
        enum bloodGroup
        integer quantity
        string hospitalName
        string district
        datetime neededBy
        enum status "PENDING | VERIFIED | DONOR_ASSIGNED | IN_PROGRESS | COMPLETED | CANCELLED"
        boolean isUrgent
    }

    DonorMatch {
        string id PK
        string requestId FK
        string donorId FK
        enum status "PENDING | ACCEPTED | DECLINED | CANCELLED"
        datetime respondedAt
    }

    Payment {
        string id PK
        string requestId FK
        string userId FK
        string paymentID UK
        string trxID UK
        decimal amount
        enum addOnType "PREMIUM_NOTIFICATION | EMERGENCY_LOGISTICS"
        enum status "PENDING | COMPLETED | FAILED | REFUNDED"
    }

    AuditLog {
        string id PK
        string performedById FK
        enum action
        string targetEntity
        string targetId
        json payload
    }
```

---

## 🚀 Module Features

### 🔐 Authentication & User Security

- **Registration**: Hashes passwords with `bcryptjs`, issues 6-digit OTP cached in Redis, emails verification code.
- **Login**: Issues `accessToken` (short-lived) and `refreshToken` (7-day duration) stored securely in `httpOnly` cookies.
- **Google OAuth**: Verifies Google ID tokens via `google-auth-library` and provisions or logs in users.
- **Password Recovery**: Secure OTP-based reset flow.

### 👤 Profile & Avatar Management

- **User Profile**: Retrieve and update profile details, address, district, phone, and donor availability toggle.
- **Avatar Upload**: Supports `multipart/form-data` image uploads stored directly on Cloudinary via `multer`.

### 🩸 Emergency Blood Requests

- **Request Creation**: Patients and Admins can create urgent or standard blood requests specifying quantity, hospital address, and required date.
- **Advanced Filtering & Pagination**: Search by blood group, district, urgency level, and status with standardized `meta` pagination parameters.
- **Soft Deletion**: Requests can be soft-deleted while retaining audit context.

### 🧬 Smart Donor Matching & Workflow

- **Medical Compatibility Check**: Automatically filters eligible donors using strict medical matrix rules:
  - `O-` can donate to all blood groups.
  - `O+` can donate to `O+`, `A+`, `B+`, `AB+`.
  - Enforces **90-day cooldown period** based on `lastDonatedAt`.
  - Filters out unverified, unavailable, or currently blocked donors.
- **Assignment & Response**: Assign matching donors to requests, allowing donors to `ACCEPT` or `DECLINE` notifications.

### 💳 bKash Payment Integration & PDF Invoicing

- **Tokenized Checkout Integration**: Handles bKash `grant-token`, `create-payment`, and `execute-payment` flows seamlessly.
- **Add-on Services**:
  - `PREMIUM_NOTIFICATION`: Instant priority fan-out alert to registered matching donors.
  - `EMERGENCY_LOGISTICS`: Rapid blood delivery transport arrangement.
- **Automated Invoicing**: Generates a PDF invoice using `pdfkit` upon payment execution and emails it directly to the user.
- **Admin Refunds**: Includes full refund capability for unfulfilled emergency logistics.

### 🛡️ Admin Hub, Audit Logging & Analytics

- **User Management**: Admins can promote/demote user roles (`DONOR`, `PATIENT`, `ADMIN`) or block malicious users.
- **Analytics Dashboard**: Aggregates live stats on user counts by role, active blood requests by status, total successful donations, and total bKash revenue generated.
- **Audit Logs**: Provides searchable audit trails tracking platform updates, administrative actions, and payment changes.

---

## 🛠️ Tech Stack & Dependencies

- **Runtime**: [Node.js](https://nodejs.org/) (v20+)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (v5.7)
- **Web Framework**: [Express.js](https://expressjs.com/) (v5.2)
- **Database & ORM**: [PostgreSQL](https://www.postgresql.org/) with [Prisma ORM](https://www.prisma.io/) (v7.10)
- **Caching & Rate Limiting**: [Redis](https://redis.io/) (v6.2)
- **Authentication**: `jsonwebtoken`, `bcryptjs`, `google-auth-library`
- **File Storage**: [Cloudinary](https://cloudinary.com/) & [Multer](https://github.com/expressjs/multer)
- **Templating & PDF**: [EJS](https://ejs.co/) & [PDFKit](https://pdfkit.org/)
- **Formatting & Linting**: [Biome](https://biomejs.dev/)

---

## 📁 Project Folder Structure

```text
src/
├── app.ts                        # Express application instance setup & middleware pipeline
├── server.ts                     # Application entry point: DB/Redis connection & server listener
├── app/
│   ├── config/                   # Centralized environment variable loader
│   ├── errors/                   # Global error handler, custom AppError, Prisma & Zod mappers
│   ├── lib/                      # Infrastructure helpers (Prisma, Redis, Nodemailer, Cloudinary, bKash, Invoice)
│   ├── middlewares/              # Express middlewares (checkAuth, validateRequest, rateLimiter)
│   ├── modules/                  # Feature Modules (Domain-Driven Structure)
│   │   ├── admin/                # Admin user management, dashboard stats & audit logs
│   │   ├── auth/                 # Registration, login, Google OAuth, OTP verification & password reset
│   │   ├── bloodRequest/         # Blood request CRUD, filtering & pagination
│   │   ├── donorMatch/           # Smart compatibility donor matching & status workflow state machine
│   │   ├── payment/              # bKash Tokenized Checkout integration & refunds
│   │   └── user/                 # User profile management & avatar uploads
│   ├── routes/                   # Central application API router (/api/v1)
│   ├── templates/                # EJS HTML email templates (verification, welcome, invoice, reset)
│   ├── types/                    # TypeScript ambient definitions & Express type extensions
│   └── utils/                    # Utility functions (catchAsync, sendResponse, jwt, database seed)
prisma/
├── schema/                       # Modular Prisma schema files
└── migrations/                   # SQL migration history
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your local machine:

- **Node.js** (v20.x or higher)
- **npm** or **yarn** / **pnpm**
- **PostgreSQL** database instance
- **Redis** server instance

### Installation & Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/hemacue-backend.git
   cd hemacue-backend
   ```

2. **Install project dependencies:**

   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env` and fill in the required credentials:
   ```bash
   cp .env.example .env
   ```

### Database Migration & Seeding

1. **Generate Prisma Client:**

   ```bash
   npx prisma generate
   ```

2. **Run Database Migrations:**

   ```bash
   npx prisma migrate dev --name init
   ```

3. **Seed Database (Optional):**
   ```bash
   npx tsx src/app/utils/seed.ts
   ```

### Running the Server

- **Development Mode (with auto-reload):**
  ```bash
  npm run dev
  ```
- **Build Project:**
  ```bash
  npm run build
  ```
- **Production Start:**
  ```bash
  npm start
  ```

---

## 🔐 Environment Variables Reference

Ensure all environment variables in your `.env` file are populated correctly:

```env
# Node Environment & Port
NODE_ENV=development
PORT=5000

# PostgreSQL Connection URL
DATABASE_URL=postgresql://user:password@localhost:5432/hemacue_db?schema=public

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Secrets & Expiry
JWT_ACCESS_SECRET=your_super_secret_access_key
JWT_ACCESS_EXPIRES_IN=1d
JWT_REFRESH_SECRET=your_super_secret_refresh_key
JWT_REFRESH_EXPIRES_IN=7d

# SMTP Configuration (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Hemacue Support <no-reply@hemacue.com>"

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# bKash Sandbox Configuration
BKASH_APP_KEY=your_bkash_app_key
BKASH_APP_SECRET=your_bkash_app_secret
BKASH_USERNAME=your_bkash_username
BKASH_PASSWORD=your_bkash_password
BKASH_BASE_URL=https://tokenized.sandbox.bka.sh/v1.2.0-beta

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

---

## 🧪 Code Quality, Formatting & Building

The project utilizes **Biome** for lightning-fast code formatting and linting:

- **Check Code Formatting:**
  ```bash
  npm run format:check
  ```
- **Fix Formatting Issues:**
  ```bash
  npm run format:fix
  ```
- **Run Linter Checks:**
  ```bash
  npm run lint:check
  ```
- **Fix Linting Errors:**
  ```bash
  npm run lint:fix
  ```
- **Build Output Verification:**
  ```bash
  npm run build
  ```

---

## 📖 API Documentation Reference

For a comprehensive, highly detailed guide covering every single endpoint, request payload, query parameter, validation schema, and JSON response envelope, refer to the dedicated API documentation file:

👉 **[API-overview-hemacue-backend.md](./API-overview-hemacue-backend.md)** in the repository root directory.
