## Flowchart diagram documentation of eraser.io

> **link: https://eraser.readme.io/docs/syntax-3**

## architecture diagram code
```eraser
// ==========================================
// 1. CLIENTS (Entry Points)
// ==========================================
Web Client [icon: browser]
Mobile App [icon: smartphone]

// ==========================================
// 2. HEMACUE BACKEND (VPC)
// ==========================================
Hemacue Backend [icon: aws-vpc] {

  // 2A. Express API Gateway & Middlewares
  API Gateway [icon: aws-api-gateway] {
    Global Rate Limiter [icon: lock] // Redis: 100 req/15m
    JWT Auth Guard [icon: key] // checkAuth.ts (Role-based)
    Zod Validator [icon: check-circle] // validateRequest.ts
  }

  // 2B. Domain Modules (Business Logic)
  Core Services [color: blue] {
    Auth Service [icon: user-check] // OTP, Login, Google OAuth
    User Profile [icon: user] // Profile, Avatar Upload
    Blood Request [icon: droplet] // CRUD, Public Feed
    Donor Match [icon: users] // Compatibility Matrix, 90-day cooldown
    Payment Service [icon: credit-card] // bKash Init/Execute, Refunds
    Admin Service [icon: settings] // User Mgmt, Analytics, Audit Logs
    Notification [icon: bell] // In-App Alerts
  }

  // 2C. State Machine & Transactions
  Workflow Engine [icon: git-merge] {
    Request State Machine // PENDING -> VERIFIED -> DONOR_ASSIGNED -> COMPLETED
    Audit Logger [icon: file-text] // Logs all critical DB changes
  }

  // 2D. Data Access Layer (Prisma ORM)
  Prisma ORM [icon: database] {
    PostgreSQL [icon: aws-rds] // Users, Requests, Payments, Logs
  }

  // 2E. Caching & Session Store
  Redis Cache [icon: aws-elasticache] {
    OTP Storage [icon: clock] // Registration & Password Reset (5 min)
    Token Cache [icon: shield] // bKash ID Tokens
    Rate Limit DB [icon: activity] // API hit counters
  }
}

// ==========================================
// 3. EXTERNAL SERVICES (Third-Party)
// ==========================================
External APIs [icon: cloud] {
  bKash Gateway [icon: aws-api-gateway] // Tokenized Checkout (Create/Execute/Refund)
  Cloudinary CDN [icon: aws-s3] // Profile Avatars
  SMTP Mailer [icon: aws-simple-email-service] // Nodemailer (OTP, Invoices, Welcome)
  Google OAuth [icon: google] // Google ID Token Verification
  PDFKit Engine [icon: file-text] // Invoice Generation
}

// ==========================================
// 4. CONNECTIONS & DATA FLOW
// ==========================================

// Client to Backend
Web Client > API Gateway
Mobile App > API Gateway

// Middleware Pipeline Flow
API Gateway > Global Rate Limiter
Global Rate Limiter > JWT Auth Guard
JWT Auth Guard > Zod Validator
Zod Validator > Core Services

// Database Connections
Core Services > Prisma ORM
Core Services > Workflow Engine
Workflow Engine > Audit Logger

// Redis Connections
Global Rate Limiter > Rate Limit DB
JWT Auth Guard > Token Cache
Auth Service > OTP Storage

// External API Connections (Specific to Modules)
Auth Service > SMTP Mailer // Sends OTPs & Welcome Emails
Auth Service > Google OAuth // Verifies social logins
User Profile > Cloudinary CDN // Uploads avatar images

Donor Match > Blood Request // Checks compatibility & 90-day cooldown

Payment Service > bKash Gateway // Initiates & Executes payments
Payment Service > PDFKit Engine // Generates PDF receipt
Payment Service > SMTP Mailer // Emails PDF receipt to user

Admin Service > Notification // Sends targeted user alerts

// External to Database
SMTP Mailer < Prisma ORM // Pulls user data to send emails
bKash Gateway < Prisma ORM // Pulls payment amounts

```

## flowchart diagram code

```eraser
direction right

User Action [shape: oval, icon: mouse-pointer]

AuthFlow [color: blue] {
  Authenticate [shape: diamond, icon: shield]
  Login or Register [icon: log-in]
  Email OTP Verify? [shape: diamond, icon: mail]
  Generate JWT [icon: key]
}

RequestFlow [color: red] {
  Need Blood? [shape: diamond, icon: droplet]
  Create Request [icon: plus-circle]
  Status: PENDING [shape: oval, icon: clock]
  Admin Verifies [icon: user-check]
  Status: VERIFIED [shape: oval, icon: check-circle]
}

MatchFlow [color: green] {
  Find Compatible Donors [icon: users]
  Cooldown Check [shape: diamond, icon: calendar]
  Assign Donor [icon: user-plus]
  Donor Responds [shape: diamond, icon: message-circle]
  Status: DONOR_ASSIGNED [shape: oval, icon: user-check]
}

PaymentFlow [color: purple] {
  Premium or Logistics Needed? [shape: diamond, icon: credit-card]
  Initiate bKash [icon: external-link]
  bKash Checkout [icon: shopping-cart]
  Execute Payment [shape: diamond, icon: check-square]
  Generate PDF Invoice [icon: file-text]
}

FulfillmentFlow [color: teal] {
  Start Transfusion [icon: activity]
  Status: IN_PROGRESS [shape: oval, icon: play]
  Finish Request [shape: diamond, icon: flag]
  Status: COMPLETED [shape: oval, icon: check-circle]
  Status: CANCELLED [shape: oval, icon: x-circle]
}

// --- FLOW CONNECTIONS ---

// Auth Logic
User Action > Authenticate
Authenticate > Login or Register: No Token
Login or Register > Email OTP Verify?
Email OTP Verify? > Generate JWT: Valid OTP
Authenticate > Need Blood?: Valid JWT

// Blood Request Logic
Need Blood? > Create Request: Patient
Create Request > Status: PENDING
Admin Verifies > Status: VERIFIED

// Donor Matching Logic
VERIFIED > Find Compatible Donors
Find Compatible Donors > Cooldown Check
Cooldown Check > Assign Donor: More than 90 Days
Cooldown Check > Find Compatible Donors: Under 90 Days (Skip)
Assign Donor > Donor Responds
Donor Responds > Status: DONOR_ASSIGNED: Accept
Donor Responds > Find Compatible Donors: Decline

// Payment Logic (Add-ons)
Premium or Logistics Needed? > Initiate bKash: Yes
Initiate bKash > bKash Checkout
bKash Checkout > Execute Payment
Execute Payment > Generate PDF Invoice: Success
Premium or Logistics Needed? > Start Transfusion: No

// Fulfillment Logic
Generate PDF Invoice > Start Transfusion
Start Transfusion > Status: IN_PROGRESS
Finish Request > Status: COMPLETED: Success (Trigger Donor Cooldown)
Finish Request > Status: CANCELLED: Failure/Emergency Stop

// Cancellation Paths
PENDING > Status: CANCELLED: Cancelled by Patient
VERIFIED > Status: CANCELLED: Cancelled by Admin

```
