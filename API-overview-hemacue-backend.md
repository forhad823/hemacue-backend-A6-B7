# Hemacue Backend — Comprehensive API Overview & Specification

> **Hemacue API Version:** `v1`
> **Local Base URL:** `http://localhost:5000/api/v1`
> **Production Base URL:** `https://hemacue-backend.vercel.app/api/v1`
> **Protocol:** HTTPS / HTTP REST
> **Data Format:** JSON (`application/json`) / Multipart (`multipart/form-data`)
> **Source of truth:** generated from the actual implementation in `src/` (routes, controllers, Zod validations, services)

---

## ⚡ At a Glance: Implemented APIs Summary

| Module            | Method   | Endpoint                                  | Access / Auth         | Description                                                   |
| :---------------- | :------- | :---------------------------------------- | :-------------------- | :------------------------------------------------------------ |
| **System**        | `GET`    | `/`                                       | Public                | Service health / welcome message (outside `/api/v1`)          |
| **Auth**          | `POST`   | `/api/v1/auth/register`                   | Public                | Register new account & email a 6-digit OTP                    |
| **Auth**          | `POST`   | `/api/v1/auth/verify-email`               | Public                | Verify OTP, create user, issue JWT tokens (body + cookies)    |
| **Auth**          | `POST`   | `/api/v1/auth/verify-email/resend-otp`    | Public                | Resend registration verification OTP                          |
| **Auth**          | `POST`   | `/api/v1/auth/login`                      | Public                | Login with email & password (body + cookies)                  |
| **Auth**          | `POST`   | `/api/v1/auth/refresh-token`              | Public (Cookie/Body)  | Rotate both access & refresh tokens                           |
| **Auth**          | `POST`   | `/api/v1/auth/google-login`               | Public                | Sign in via Google OAuth ID Token                             |
| **Auth**          | `POST`   | `/api/v1/auth/forgot-password`            | Public                | Send password reset OTP (also used to resend)                 |
| **Auth**          | `POST`   | `/api/v1/auth/reset-password`             | Public                | Reset password using OTP                                      |
| **Auth**          | `POST`   | `/api/v1/auth/logout`                     | Public                | Clear auth cookies                                            |
| **User**          | `GET`    | `/api/v1/users/me`                        | DONOR, PATIENT, ADMIN | Get current user profile details                              |
| **User**          | `PATCH`  | `/api/v1/users/me`                        | DONOR, PATIENT, ADMIN | Update own profile & availability                             |
| **User**          | `PATCH`  | `/api/v1/users/me/avatar`                 | DONOR, PATIENT, ADMIN | Upload profile avatar image to Cloudinary                     |
| **Blood Request** | `POST`   | `/api/v1/blood-requests`                  | PATIENT, ADMIN        | Create new blood donation request                             |
| **Blood Request** | `GET`    | `/api/v1/blood-requests`                  | Public                | List & search requests with filters & pagination              |
| **Blood Request** | `GET`    | `/api/v1/blood-requests/my-requests`      | PATIENT, ADMIN        | Fetch requests created by the logged in user                  |
| **Blood Request** | `GET`    | `/api/v1/blood-requests/:id`              | Public                | Fetch request detail incl. requester & assignments            |
| **Blood Request** | `PATCH`  | `/api/v1/blood-requests/:id`              | PATIENT, ADMIN        | Update blood request details (owner or admin)                 |
| **Blood Request** | `DELETE` | `/api/v1/blood-requests/:id`              | PATIENT, ADMIN        | Soft delete a blood request (owner or admin)                  |
| **Donor Match**   | `GET`    | `/api/v1/donor-matches/compatible-donors` | PATIENT, ADMIN        | Find eligible donors (compatibility matrix + 90-day cooldown) |
| **Donor Match**   | `POST`   | `/api/v1/donor-matches/assign-donor`      | PATIENT, ADMIN        | Manually assign a donor to a **VERIFIED** request             |
| **Donor Match**   | `GET`    | `/api/v1/donor-matches/my-donations`      | DONOR                 | Donor's assignment / donation history                         |
| **Donor Match**   | `POST`   | `/api/v1/blood-requests/:id/respond`      | DONOR                 | Donor `ACCEPTED` / `DECLINED` response to an assignment       |
| **Donor Match**   | `PATCH`  | `/api/v1/blood-requests/:id/status`       | PATIENT, ADMIN        | Advance request status through guarded state machine          |
| **Payment**       | `POST`   | `/api/v1/payments/initiate`               | PATIENT, ADMIN        | Initiate bKash Tokenized Checkout payment                     |
| **Payment**       | `POST`   | `/api/v1/payments/execute`                | PATIENT, ADMIN        | Execute bKash payment, generate PDF & email invoice           |
| **Payment**       | `POST`   | `/api/v1/payments/refund/:requestId`      | ADMIN                 | Refund emergency logistics payment                            |
| **Payment**       | `GET`    | `/api/v1/payments/mine`                   | PATIENT, ADMIN        | List the user's payment transaction history                   |
| **Payment**       | `GET`    | `/api/v1/payments/:id`                    | PATIENT, ADMIN        | Payment detail by DB id **or** bKash `paymentID`              |
| **Admin**         | `GET`    | `/api/v1/admin/users`                     | ADMIN                 | List & search all platform users                              |
| **Admin**         | `GET`    | `/api/v1/admin/payments`                  | ADMIN                 | List & search all platform payments                           |
| **Admin**         | `PATCH`  | `/api/v1/admin/users/:id/role`            | ADMIN                 | Change user role / status / soft-delete flag                  |
| **Admin**         | `GET`    | `/api/v1/admin/dashboard-stats`           | ADMIN                 | Platform aggregate stats & revenue analytics                  |
| **Admin**         | `GET`    | `/api/v1/admin/audit-logs`                | ADMIN                 | Search audit logs & action trails                             |
| **Notification**  | `POST`   | `/api/v1/notifications`                   | ADMIN                 | Create a notification targeted at a user                      |
| **Notification**  | `GET`    | `/api/v1/notifications`                   | DONOR, PATIENT, ADMIN | List & search the caller's own notifications (paginated)      |

---

## 📑 Table of Contents

0. [⚡ At a Glance: Implemented APIs Summary](#-at-a-glance-implemented-apis-summary)
1. [Global API Conventions & Envelopes](#1-global-api-conventions--envelopes)
2. [Authentication & Authorization Model](#2-authentication--authorization-model)
3. [Module 1: Authentication (`/auth`)](#module-1-authentication-auth)
4. [Module 2: User & Profile Management (`/users`)](#module-2-user--profile-management-users)
5. [Module 3: Blood Requests (`/blood-requests`)](#module-3-blood-requests-blood-requests)
6. [Module 4: Smart Donor Matching & Request Workflow (`/donor-matches` & `/blood-requests`)](#module-4-smart-donor-matching--request-workflow-donor-matches--blood-requests)
7. [Module 5: bKash Tokenized Payments (`/payments`)](#module-5-bkash-tokenized-payments-payments)
8. [Module 6: Admin Administration & Audit Analytics (`/admin`)](#module-6-admin-administration--audit-analytics-admin)
9. [Module 7: In-App Notifications (`/notifications`)](#module-7-in-app-notifications-notifications)
10. [Common System Enums](#common-system-enums)
11. [Common Error Catalog](#10-common-error-catalog)

---

## 1. Global API Conventions & Envelopes

### 1.1 Root / Health Route

```http
GET /
```

```json
{
  "success": true,
  "message": "Welcome to Hemacue Backend, The blood donation and emergency service platform."
}
```

### 1.2 Success Response Structure

All module endpoints use `sendResponse` (`src/app/utils/sendResponse.ts`). The HTTP status
code is sent as the real response status; the JSON body contains:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5,
    "totalPage": 5
  },
  "data": {}
}
```

- `meta` is present **only** on paginated list endpoints (both `totalPages` and `totalPage`
  carry the same value — legacy compatibility).
- `data` is `null` when there is no payload (e.g. delete, logout, OTP endpoints).
- There is **no** `statusCode` field inside the body — the status is only in the HTTP response.

### 1.3 Error Response Structure

Errors are shaped by the global error handler (`src/app/errors/globalErrorHandler.ts`)
and by the rate limiter:

```json
{
  "success": false,
  "message": "Validation Error",
  "errors": [
    {
      "path": "email",
      "message": "Invalid email format"
    }
  ],
  "stack": "Error stack trace (only in development environment)"
}
```

- The array field is named **`errors`** (not `errorSources`).
- `stack` is included only when `NODE_ENV=development`.
- Rate-limited responses use HTTP `429` with the same `errors[]` shape.
- Unknown routes return HTTP `404`:

```json
{
  "success": false,
  "message": "API Not Found",
  "errors": [{ "path": "/api/v1/nope", "message": "API Not Found" }]
}
```

### 1.4 HTTP Status Codes Used

| Code  | Meaning in this API                                                |
| :---- | :----------------------------------------------------------------- |
| `200` | OK — read, update, login, verify, execute, refund, respond, status |
| `201` | Created — register, create blood request, assign donor, initiate   |
| `400` | Bad request — Zod validation, invalid state transition, business   |
| `401` | Unauthenticated — missing/invalid token, wrong credentials         |
| `403` | Forbidden — role mismatch, deleted/blocked account, ownership      |
| `404` | Not found — unknown route or entity                                |
| `409` | Conflict — already verified email, assignment already responded    |
| `429` | Too many requests — rate limiter hit                               |
| `500` | Unexpected server error                                            |
| `502` | bKash gateway failure (create/execute/refund)                      |

### 1.5 Rate Limiting (Redis)

| Limiter                  | Limit                     | Applied to                                                                           |
| :----------------------- | :------------------------ | :----------------------------------------------------------------------------------- |
| `globalRateLimiter`      | **100 req / 15 min / IP** | Every request (mounted globally in `app.ts`)                                         |
| `authPaymentRateLimiter` | **30 req / 15 min / IP**  | All `/auth` POSTs except `logout`, plus `/payments/initiate` and `/payments/execute` |

If Redis fails, the limiter fails open (requests are allowed through).

### 1.6 Pagination & Sorting Convention

List endpoints accept (defaults in parentheses):

| Param        | Type / Constraints                         | Default                       |
| :----------- | :----------------------------------------- | :---------------------------- |
| `page`       | integer, min `1`                           | `1`                           |
| `limit`      | integer, min `1`, max `100`                | `10` (`6` for `my-donations`) |
| `sortOrder`  | `asc` \| `desc`                            | `desc`                        |
| `sortBy`     | endpoint-specific enum (see each endpoint) | endpoint-specific             |
| `searchTerm` | trimmed string (case-insensitive contains) | none                          |

---

## 2. Authentication & Authorization Model

### 2.1 Token Sources (checked in this order — `src/app/middlewares/checkAuth.ts`)

1. Cookie: `accessToken`
2. Header: `Authorization: Bearer <accessToken>`
3. Header: raw `Authorization: <accessToken>` (fallback)

```http
Authorization: Bearer <accessToken>
```

### 2.2 Cookies

Set (httpOnly) on `verify-email`, `login`, `refresh-token`, `google-login`; cleared on `logout`:

| Cookie         | Max Age | Attributes                                                          |
| :------------- | :------ | :------------------------------------------------------------------ |
| `accessToken`  | 1 day   | `httpOnly`; `secure` in production, `sameSite: none` (`lax` in dev) |
| `refreshToken` | 7 days  | same as above                                                       |

### 2.3 JWT Payload

```json
{
  "userId": "uuid",
  "name": "Rahim Uddin",
  "email": "rahim@example.com",
  "role": "DONOR",
  "bloodGroup": "O_POSITIVE"
}
```

### 2.4 Role-Based Access Control (RBAC)

Roles: `DONOR`, `PATIENT`, `ADMIN`

| Role      | Capabilities                                                                                                              |
| :-------- | :------------------------------------------------------------------------------------------------------------------------ |
| `PATIENT` | Create/update/delete own blood requests, assign donors, advance status, initiate/execute payments, view own payments      |
| `DONOR`   | Respond to assignments (`ACCEPTED`/`DECLINED`), view own donation history, manage own profile                             |
| `ADMIN`   | Everything above + verify requests, all users/payments lists, role & status changes, refunds, dashboard stats, audit logs |
| any auth  | View/update own profile, upload avatar                                                                                    |

Common auth errors:

- No token → `401` `"You are not logged in. Please log in to access this resource."`
- Invalid token → `401` `"Invalid access token. Please log in again."`
- Wrong role → `403` `"Forbidden. You don't have permission to access this resource."`
- Soft-deleted account → `403` `"Your account has been deleted or blocked."`

> **Note:** login also honors `refreshToken`/`accessToken` cookies first; Bearer header is
> enough for Postman.

---

## Module 1: Authentication (`/auth`)

All endpoints below are rate limited by `authPaymentRateLimiter` (**30 req / 15 min / IP**)
except `POST /auth/logout`, which has no rate limiter.

### 1.1 Register User

- **Endpoint**: `POST /auth/register`
- **Auth**: Public
- **Rate Limit**: 30 req / 15 min / IP
- **Description**: Validates the payload, stores the registration data + a 6-digit OTP in
  Redis (5 min expiry) and emails a verification OTP. **No user row is created yet** —
  the user is created by `verify-email`.

#### Request Body

```json
{
  "name": "Rahim Uddin",
  "email": "rahim@example.com",
  "password": "Password@123",
  "role": "DONOR",
  "bloodGroup": "O_POSITIVE",
  "phone": "+8801700000000",
  "district": "Dhaka",
  "city": "Dhaka",
  "address": "Mirpur-10"
}
```

#### Validation Rules

| Field        | Rules                                                           |
| :----------- | :-------------------------------------------------------------- |
| `name`       | string, required, min 2 chars                                   |
| `email`      | valid email, required                                           |
| `password`   | min 6 chars + ≥1 lowercase, ≥1 uppercase, ≥1 number, ≥1 special |
| `role`       | `DONOR` \| `PATIENT`, **default `DONOR`** (`ADMIN` not allowed) |
| `bloodGroup` | enum `BloodGroup`, required                                     |
| `phone`      | non-empty string, required                                      |
| `district`   | non-empty string, required                                      |
| `city`       | non-empty string, required                                      |
| `address`    | string, optional                                                |

#### Success Response (`201 Created`)

```json
{
  "success": true,
  "message": "Verification OTP Sent to your email",
  "data": null
}
```

---

### 1.2 Verify Email OTP

- **Endpoint**: `POST /auth/verify-email`
- **Auth**: Public
- **Rate Limit**: 30 req / 15 min / IP
- **Description**: Validates the 6-digit OTP against Redis, creates the user account,
  clears Redis keys, issues JWT tokens (body **and** httpOnly cookies) and sends the
  welcome email.

#### Request Body

```json
{
  "email": "rahim@example.com",
  "otp": "482910"
}
```

#### Validation Rules

- `email`: valid email, required
- `otp`: string, exactly 6 characters

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "message": "Email Verified Successfully",
  "data": {
    "user": {
      "id": "3f0c9d1e-7b2a-4c58-9f31-2a6b5d4e8f90",
      "name": "Rahim Uddin",
      "email": "rahim@example.com",
      "role": "DONOR",
      "bloodGroup": "O_POSITIVE",
      "phone": "+8801700000000",
      "district": "Dhaka",
      "city": "Dhaka",
      "address": "Mirpur-10",
      "isAvailable": true,
      "status": "ACTIVE",
      "isEmailVerified": true,
      "authProvider": "CREDENTIAL",
      "createdAt": "2026-10-05T16:00:00.000Z",
      "updatedAt": "2026-10-05T16:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsIn..."
  }
}
```

---

### 1.3 Resend Registration OTP

- **Endpoint**: `POST /auth/verify-email/resend-otp`
- **Auth**: Public
- **Rate Limit**: 30 req / 15 min / IP
- **Description**: Regenerates and resends the registration OTP for a pending registration.

#### Request Body

```json
{
  "email": "rahim@example.com"
}
```

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "message": "OTP Sent To Email: rahim@example.com",
  "data": null
}
```

---

### 1.4 User Login

- **Endpoint**: `POST /auth/login`
- **Auth**: Public
- **Rate Limit**: 30 req / 15 min / IP
- **Description**: Authenticates credentials, then returns tokens in the body **and** sets
  the httpOnly cookies. Google-provisioned accounts (`authProvider: GOOGLE`) are rejected
  here and must use `google-login`.

#### Request Body

```json
{
  "email": "rahim@example.com",
  "password": "Password@123"
}
```

#### Validation Rules

- `email`: valid email
- `password`: required and must satisfy the same complexity regex as register
  (≥1 lowercase, ≥1 uppercase, ≥1 number, ≥1 special character) — the account lookup
  then compares with bcrypt.

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "message": "User logged in successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsIn..."
  }
}
```

> The user profile is **not** included — call `GET /users/me` afterwards.

---

### 1.5 Refresh Access Token

- **Endpoint**: `POST /auth/refresh-token`
- **Auth**: Public — reads `refreshToken` cookie first, then `refreshToken` from the JSON body
- **Rate Limit**: 30 req / 15 min / IP
- **Description**: Verifies the refresh token, confirms the user is active, then rotates
  **both** tokens (new access + new refresh) into cookies and the response body.

#### Request Body (only if no cookie)

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsIn..."
}
```

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "message": "New tokens generated successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsIn..."
  }
}
```

#### Error (`401`)

- `"Refresh token is missing"` — neither cookie nor body token provided
- `"Invalid or expired refresh token"` (prod) — verification failed
- `"User is inactive, blocked, or not found"`

---

### 1.6 Google OAuth Login

- **Endpoint**: `POST /auth/google-login`
- **Auth**: Public
- **Rate Limit**: 30 req / 15 min / IP
- **Description**: Verifies the Google ID token (`google-auth-library`), finds or creates
  the user (new Google users default to `role: DONOR`, `bloodGroup: O_POSITIVE`,
  `isEmailVerified: true`), issues tokens + cookies.

#### Request Body

```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImt..."
}
```

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "message": "User logged in with Google successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1...",
    "refreshToken": "eyJhbGciOiJIUzI1..."
  }
}
```

---

### 1.7 Forgot Password

- **Endpoint**: `POST /auth/forgot-password`
- **Auth**: Public
- **Rate Limit**: 30 req / 15 min / IP
- **Description**: Generates a 6-digit reset OTP, stores it in Redis (5 min expiry) and
  emails it. **To resend, call this same endpoint again.**

#### Request Body

```json
{
  "email": "rahim@example.com"
}
```

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "message": "OTP Sent To Email: rahim@example.com",
  "data": null
}
```

---

### 1.8 Reset Password

- **Endpoint**: `POST /auth/reset-password`
- **Auth**: Public
- **Rate Limit**: 30 req / 15 min / IP
- **Description**: Verifies the OTP from Redis, hashes the new password and updates the user.

#### Request Body

```json
{
  "email": "rahim@example.com",
  "otp": "859201",
  "newPassword": "NewPassword@123"
}
```

#### Validation Rules

- `newPassword`: min 6 chars + same complexity rules as register
- `otp`: exactly 6 characters

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "message": "Password Changed Successfully",
  "data": null
}
```

---

### 1.9 Logout User

- **Endpoint**: `POST /auth/logout`
- **Auth**: Public (no token required — it only clears cookies)
- **Rate Limit**: none
- **Description**: Clears `accessToken` and `refreshToken` httpOnly cookies.

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "message": "User Logged Out Successfully",
  "data": null
}
```

---

## Module 2: User & Profile Management (`/users`)

### 2.1 Get Current User Profile

- **Endpoint**: `GET /users/me`
- **Auth**: Authenticated (`DONOR`, `PATIENT`, `ADMIN`)
- **Description**: Retrieves the logged-in user's profile plus derived counters.

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "id": "3f0c9d1e-7b2a-4c58-9f31-2a6b5d4e8f90",
    "name": "Rahim Uddin",
    "email": "rahim@example.com",
    "role": "DONOR",
    "bloodGroup": "O_POSITIVE",
    "phone": "+8801700000000",
    "district": "Dhaka",
    "city": "Dhaka",
    "address": "Mirpur-10",
    "latitude": null,
    "longitude": null,
    "isAvailable": true,
    "status": "ACTIVE",
    "lastDonatedAt": "2026-05-10T00:00:00.000Z",
    "avatarUrl": "https://res.cloudinary.com/demo/image/upload/v12345/avatar.jpg",
    "authProvider": "CREDENTIAL",
    "isEmailVerified": true,
    "createdAt": "2026-01-10T08:00:00.000Z",
    "updatedAt": "2026-10-05T16:00:00.000Z",
    "totalBloodRequests": 3,
    "totalCompletedDonations": 2
  }
}
```

Errors: `404 "User profile not found"`, `403 "User profile is blocked"`.

---

### 2.2 Update Profile

- **Endpoint**: `PATCH /users/me`
- **Auth**: Authenticated (`DONOR`, `PATIENT`, `ADMIN`)
- **Description**: Partial update of the own profile. **All fields are optional.**
  Side-effect: if `lastDonatedAt` is set to a date within the last 90 days,
  `isAvailable` is forced to `false` (90-day cooldown).

#### Request Body (all optional)

```json
{
  "name": "Rahim Uddin",
  "phone": "+8801799999999",
  "district": "Gazipur",
  "city": "Gazipur Sadar",
  "address": "Chowrasta",
  "latitude": 23.7461,
  "longitude": 90.3742,
  "isAvailable": false,
  "lastDonatedAt": "2026-09-01T00:00:00.000Z",
  "bloodGroup": "O_POSITIVE"
}
```

#### Validation Rules

| Field           | Rules                       |
| :-------------- | :-------------------------- |
| `name`          | string, min 2 chars         |
| `phone`         | string                      |
| `district`      | string                      |
| `city`          | string                      |
| `address`       | string                      |
| `latitude`      | number                      |
| `longitude`     | number                      |
| `isAvailable`   | boolean                     |
| `lastDonatedAt` | ISO datetime string or Date |
| `bloodGroup`    | enum `BloodGroup`           |

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "message": "User profile updated successfully",
  "data": {
    "id": "3f0c9d1e-7b2a-4c58-9f31-2a6b5d4e8f90",
    "name": "Rahim Uddin",
    "email": "rahim@example.com",
    "role": "DONOR",
    "bloodGroup": "O_POSITIVE",
    "phone": "+8801799999999",
    "district": "Gazipur",
    "city": "Gazipur Sadar",
    "address": "Chowrasta",
    "latitude": 23.7461,
    "longitude": 90.3742,
    "isAvailable": false,
    "status": "ACTIVE",
    "lastDonatedAt": "2026-09-01T00:00:00.000Z",
    "avatarUrl": "https://res.cloudinary.com/demo/image/upload/v12345/avatar.jpg",
    "updatedAt": "2026-10-06T09:12:00.000Z"
  }
}
```

---

### 2.3 Upload Avatar

- **Endpoint**: `PATCH /users/me/avatar`
- **Auth**: Authenticated (`DONOR`, `PATIENT`, `ADMIN`)
- **Content-Type**: `multipart/form-data`
- **Form Field**: `avatar` (File, required) — Multer memory storage → Cloudinary
- **Description**: Uploads the profile picture and stores the secure URL.

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "message": "Avatar uploaded successfully",
  "data": {
    "id": "3f0c9d1e-7b2a-4c58-9f31-2a6b5d4e8f90",
    "name": "Rahim Uddin",
    "email": "rahim@example.com",
    "avatarUrl": "https://res.cloudinary.com/demo/image/upload/v98765/hemacue/avatars/user123.jpg"
  }
}
```

Error: `400 "Please upload an image file"` when no file is sent.

---

## Module 3: Blood Requests (`/blood-requests`)

Select shape for list endpoints (`BLOOD_REQUEST_SELECT`): `id`, `requesterId`,
`patientName`, `patientAge`, `bloodGroup`, `unitsRequired`, `hospitalName`,
`hospitalAddress`, `district`, `city`, `latitude`, `longitude`, `urgency`, `status`,
`neededBy`, `isPremiumNotificationPaid`, `isLogisticsPaid`, `notes`, `createdAt`,
`updatedAt` (+ `_count.assignments` on lists).

### 3.1 Create Blood Request

- **Endpoint**: `POST /blood-requests`
- **Auth**: Authenticated (`PATIENT`, `ADMIN`)
- **Description**: Creates a new blood donation request with `status: PENDING`.
  Defaults applied by the service: `unitsRequired → 1`, `urgency → NORMAL`.

#### Request Body

```json
{
  "patientName": "Karin Chowdhury",
  "patientAge": 40,
  "bloodGroup": "AB_POSITIVE",
  "unitsRequired": 2,
  "hospitalName": "Square Hospital",
  "hospitalAddress": "Panthapath, Dhaka",
  "district": "Dhaka",
  "city": "Dhaka",
  "latitude": 23.7585,
  "longitude": 90.3835,
  "urgency": "EMERGENCY",
  "neededBy": "2026-10-10T14:00:00.000Z",
  "notes": "Elective surgery"
}
```

#### Validation Rules

| Field             | Rules                                      | Required |
| :---------------- | :----------------------------------------- | :------- |
| `patientName`     | string, min 2 chars                        | ✅       |
| `patientAge`      | integer, 1–120                             | ✅       |
| `bloodGroup`      | enum `BloodGroup`                          | ✅       |
| `unitsRequired`   | integer, min 1 (defaults to `1`)           | ➖       |
| `hospitalName`    | non-empty string                           | ✅       |
| `hospitalAddress` | non-empty string                           | ✅       |
| `district`        | non-empty string                           | ✅       |
| `city`            | non-empty string                           | ✅       |
| `latitude`        | number                                     | ➖       |
| `longitude`       | number                                     | ➖       |
| `urgency`         | enum `UrgencyLevel` (defaults to `NORMAL`) | ➖       |
| `neededBy`        | ISO datetime string (or Date)              | ✅       |
| `notes`           | string                                     | ➖       |

#### Success Response (`201 Created`)

```json
{
  "success": true,
  "message": "Blood request created successfully",
  "data": {
    "id": "2436a8f5-f3ce-43f1-9b07-702b0e343338",
    "requesterId": "3f0c9d1e-7b2a-4c58-9f31-2a6b5d4e8f90",
    "patientName": "Karin Chowdhury",
    "patientAge": 40,
    "bloodGroup": "AB_POSITIVE",
    "unitsRequired": 2,
    "hospitalName": "Square Hospital",
    "hospitalAddress": "Panthapath, Dhaka",
    "district": "Dhaka",
    "city": "Dhaka",
    "latitude": 23.7585,
    "longitude": 90.3835,
    "urgency": "EMERGENCY",
    "status": "PENDING",
    "neededBy": "2026-10-10T14:00:00.000Z",
    "isPremiumNotificationPaid": false,
    "isLogisticsPaid": false,
    "notes": "Elective surgery",
    "createdAt": "2026-10-05T16:00:00.000Z",
    "updatedAt": "2026-10-05T16:00:00.000Z"
  }
}
```

---

### 3.2 Get All Blood Requests (Public Feed & Search)

- **Endpoint**: `GET /blood-requests`
- **Auth**: Public
- **Description**: Paginated public feed. Soft-deleted requests are always excluded.

#### Query Parameters

| Param         | Type / Rules                                                                                                              | Default     |
| :------------ | :------------------------------------------------------------------------------------------------------------------------ | :---------- |
| `page`        | integer ≥ 1                                                                                                               | `1`         |
| `limit`       | integer 1–100                                                                                                             | `10`        |
| `sortBy`      | `createdAt` \| `updatedAt` \| `neededBy` \| `patientName` \| `bloodGroup` \| `urgency`                                    | `createdAt` |
| `sortOrder`   | `asc` \| `desc`                                                                                                           | `desc`      |
| `bloodGroup`  | enum `BloodGroup` (exact match)                                                                                           | —           |
| `bloodGroups` | comma-separated list, e.g. `O_NEGATIVE,O_POSITIVE` (compatible-groups query; narrowed by `bloodGroup` when both are sent) | —           |
| `neededFrom`  | ISO datetime — only requests with `neededBy >= neededFrom`                                                                | —           |
| `district`    | trimmed string (exact match)                                                                                              | —           |
| `urgency`     | enum `UrgencyLevel`                                                                                                       | —           |
| `status`      | enum `RequestStatus`                                                                                                      | —           |
| `searchTerm`  | matches `hospitalName`, `patientName`, `city` (insensitive)                                                               | —           |

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "message": "Blood requests retrieved successfully",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1,
    "totalPage": 1
  },
  "data": [
    {
      "id": "2436a8f5-f3ce-43f1-9b07-702b0e343338",
      "patientName": "Karin Chowdhury",
      "patientAge": 40,
      "bloodGroup": "AB_POSITIVE",
      "unitsRequired": 2,
      "hospitalName": "Square Hospital",
      "district": "Dhaka",
      "city": "Dhaka",
      "urgency": "EMERGENCY",
      "status": "PENDING",
      "neededBy": "2026-10-10T14:00:00.000Z",
      "isPremiumNotificationPaid": false,
      "isLogisticsPaid": false,
      "notes": "Elective surgery",
      "createdAt": "2026-10-05T16:00:00.000Z",
      "updatedAt": "2026-10-05T16:00:00.000Z",
      "_count": { "assignments": 0 }
    }
  ]
}
```

---

### 3.3 Get My Blood Requests

- **Endpoint**: `GET /blood-requests/my-requests`
- **Auth**: Authenticated (`PATIENT`, `ADMIN`)
- **Description**: Same filters/pagination as §3.2, scoped to `requesterId = current user`.

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "message": "My blood requests retrieved successfully",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1,
    "totalPage": 1
  },
  "data": []
}
```

---

### 3.4 Get Blood Request By ID

- **Endpoint**: `GET /blood-requests/:id`
- **Auth**: Public
- **Description**: Detailed request incl. `requester` and all `assignments` (with donor
  summaries).

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "message": "Blood request retrieved successfully",
  "data": {
    "id": "2436a8f5-f3ce-43f1-9b07-702b0e343338",
    "patientName": "Karin Chowdhury",
    "bloodGroup": "AB_POSITIVE",
    "hospitalName": "Square Hospital",
    "status": "DONOR_ASSIGNED",
    "requester": {
      "id": "3f0c9d1e-7b2a-4c58-9f31-2a6b5d4e8f90",
      "name": "Rahim Uddin",
      "email": "rahim@example.com",
      "phone": "+8801700000000",
      "bloodGroup": "O_POSITIVE",
      "district": "Dhaka",
      "city": "Dhaka",
      "avatarUrl": null
    },
    "assignments": [
      {
        "id": "9b1c4a77-4e61-42a9-8b3c-76f3a2d1c905",
        "donorId": "5274a612-2625-46e1-b2ec-7e218a5c0825",
        "status": "ACCEPTED",
        "respondedAt": "2026-10-05T16:30:00.000Z",
        "donor": {
          "id": "5274a612-2625-46e1-b2ec-7e218a5c0825",
          "name": "Dr. Hasan",
          "email": "hasan@example.com",
          "phone": "+8801811112222",
          "bloodGroup": "O_NEGATIVE",
          "district": "Dhaka",
          "city": "Dhaka",
          "avatarUrl": null,
          "lastDonatedAt": null,
          "isAvailable": true
        }
      }
    ]
  }
}
```

Error: `404 "Blood request not found"`.

---

### 3.5 Update Blood Request

- **Endpoint**: `PATCH /blood-requests/:id`
- **Auth**: Authenticated (`PATIENT`, `ADMIN`) — service additionally enforces
  **owner-or-admin**: non-admins get `403 "You are not allowed to update this blood request"`
- **Description**: Partial update of request details. All body fields optional (same
  constraints as §3.1).

#### Request Body (all optional)

```json
{
  "unitsRequired": 3,
  "hospitalName": "Combined Military Hospital",
  "hospitalAddress": "Dhaka, Mirpur",
  "urgency": "HIGH",
  "neededBy": "2026-10-12T10:00:00.000Z",
  "notes": "Surgery shifted earlier"
}
```

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "message": "Blood request updated successfully",
  "data": { "id": "2436a8f5-f3ce-43f1-9b07-702b0e343338", "unitsRequired": 3 }
}
```

_(`data` is the full `BLOOD_REQUEST_SELECT` object.)_

---

### 3.6 Soft Delete Blood Request

- **Endpoint**: `DELETE /blood-requests/:id`
- **Auth**: Authenticated (`PATIENT`, `ADMIN`) — owner-or-admin enforced in the service
- **Description**: Sets `isDeleted: true` (the row remains, hidden from all queries).

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "message": "Blood request deleted successfully",
  "data": null
}
```

---

## Module 4: Smart Donor Matching & Request Workflow (`/donor-matches` & `/blood-requests`)

Mounted from two routers (`src/app/modules/donorMatch/donorMatch.route.ts`):

- `DonorMatchRoutes` → `/api/v1/donor-matches`
- `DonorMatchRequestRoutes` → `/api/v1/blood-requests` (adds `/:id/respond` and `/:id/status`)

### 4.1 Find Compatible Donors

- **Endpoint**: `GET /donor-matches/compatible-donors`
- **Auth**: Authenticated (`PATIENT`, `ADMIN`)
- **Description**: Returns active, available, non-deleted donors whose blood group is
  compatible (medical matrix), who are **not** on the 90-day donation cooldown
  (`lastDonatedAt` null or ≥ 90 days ago), ordered by `lastDonatedAt desc`. If
  `requestId` is provided, donors already assigned to that request are excluded.
  **Not paginated** — full result set is returned.

#### Query Parameters

| Param        | Type / Rules                        | Required |
| :----------- | :---------------------------------- | :------- |
| `bloodGroup` | enum `BloodGroup` (recipient group) | ✅       |
| `district`   | trimmed string                      | ➖       |
| `requestId`  | UUID                                | ➖       |

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "message": "Compatible donors retrieved successfully",
  "data": [
    {
      "id": "5274a612-2625-46e1-b2ec-7e218a5c0825",
      "name": "Dr. Hasan",
      "email": "hasan@example.com",
      "phone": "+8801811112222",
      "bloodGroup": "O_NEGATIVE",
      "district": "Dhaka",
      "city": "Dhaka",
      "address": "Dhanmondi",
      "isAvailable": true,
      "lastDonatedAt": "2025-12-01T00:00:00.000Z",
      "avatarUrl": null
    }
  ]
}
```

---

### 4.2 Assign Donor to Request

- **Endpoint**: `POST /donor-matches/assign-donor`
- **Auth**: Authenticated (`PATIENT`, `ADMIN`)
- **Description**: Creates a `DonorAssignment` (initial status `NOTIFIED`) for a donor.
  **Business rule:** the blood request must be in status `VERIFIED`, otherwise
  `400 "Cannot assign donor to a request that is not verified"`.
  The donor must exist, be a `DONOR` and not soft-deleted.

#### Request Body

```json
{
  "donorId": "5274a612-2625-46e1-b2ec-7e218a5c0825",
  "requestId": "2436a8f5-f3ce-43f1-9b07-702b0e343338"
}
```

Both fields must be valid UUIDs.

#### Success Response (`201 Created`)

```json
{
  "success": true,
  "message": "Donor assigned successfully",
  "data": {
    "id": "9b1c4a77-4e61-42a9-8b3c-76f3a2d1c905",
    "donorId": "5274a612-2625-46e1-b2ec-7e218a5c0825",
    "requestId": "2436a8f5-f3ce-43f1-9b07-702b0e343338",
    "status": "NOTIFIED",
    "notifiedAt": "2026-10-05T16:20:00.000Z",
    "respondedAt": null,
    "createdAt": "2026-10-05T16:20:00.000Z",
    "updatedAt": "2026-10-05T16:20:00.000Z"
  }
}
```

---

### 4.3 Respond to Match Request (Donor Action)

- **Endpoint**: `POST /blood-requests/:id/respond`
- **Auth**: Authenticated (`DONOR` only)
- **Params**: `id` — blood request UUID (must have an assignment for this donor)
- **Description**: The assigned donor accepts or declines. On **accept**: assignment →
  `ACCEPTED`, other `NOTIFIED` assignments → `CANCELLED`, request → `DONOR_ASSIGNED`,
  audit log `DONOR_ACCEPTED` written. On **decline**: assignment → `DECLINED`, audit log
  `DONOR_DECLINED` written.

#### Request Body

```json
{
  "response": "ACCEPTED"
}
```

| Field      | Rules                                           |
| :--------- | :---------------------------------------------- |
| `response` | enum: `ACCEPTED` \| `DECLINED` (only these two) |

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "message": "Donation accepted successfully",
  "data": null
}
```

Decline message: `"Donation request declined"`.

#### Key Business Errors

| Status | Message                                                                     |
| :----- | :-------------------------------------------------------------------------- |
| `404`  | `"You have not been assigned to this blood request"`                        |
| `404`  | `"This blood request is no longer active"`                                  |
| `409`  | `"This assignment was already <status>"`                                    |
| `400`  | `"This blood request is no longer accepting donors"`                        |
| `400`  | `"Blood request is not verified yet. Please try again after verification."` |
| `409`  | `"Another donor has already accepted this request"`                         |

---

### 4.4 Update Request Workflow Status

- **Endpoint**: `PATCH /blood-requests/:id/status`
- **Auth**: Authenticated (`PATIENT`, `ADMIN`) — service enforces owner-or-admin;
  **only `ADMIN` may set `VERIFIED`**
- **Params**: `id` — blood request UUID
- **Description**: Advances the guarded state machine and writes a `STATUS_CHANGE` audit log.

Allowed transitions:

```
PENDING        → VERIFIED | CANCELLED
VERIFIED       → CANCELLED                (donor assignment happens via assign-donor / auto-notify)
DONOR_ASSIGNED → IN_PROGRESS | CANCELLED
IN_PROGRESS    → COMPLETED | CANCELLED
COMPLETED      → (terminal)
CANCELLED      → (terminal)
```

Side effects:

- `COMPLETED` → accepted assignment becomes `COMPLETED`; donor's `lastDonatedAt = now`
  and `isAvailable = false` (90-day cooldown starts)
- `CANCELLED` → all `NOTIFIED`/`ACCEPTED` assignments become `CANCELLED`

#### Request Body

```json
{
  "status": "VERIFIED"
}
```

| Field    | Rules                                                                                                                |
| :------- | :------------------------------------------------------------------------------------------------------------------- |
| `status` | enum: `VERIFIED` \| `IN_PROGRESS` \| `COMPLETED` \| `CANCELLED` (`PENDING` and `DONOR_ASSIGNED` are rejected by Zod) |

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "message": "Blood request status updated to VERIFIED successfully",
  "data": { "status": "VERIFIED" }
}
```

#### Key Business Errors

- `400 "Cannot change request status from <from> to <to>"` — illegal transition
- `403 "Only an admin can verify a blood request"`
- `403 "You are not allowed to update the status of this blood request"`
- `404 "Blood request not found"`

---

### 4.5 Get My Donation History

- **Endpoint**: `GET /donor-matches/my-donations`
- **Auth**: Authenticated (`DONOR` only)
- **Description**: Paginated history of the donor's assignments incl. request summaries.

#### Query Parameters

| Param        | Type / Rules                                         | Default      |
| :----------- | :--------------------------------------------------- | :----------- |
| `page`       | integer ≥ 1                                          | `1`          |
| `limit`      | integer 1–100                                        | `6`          |
| `sortBy`     | `assignedAt` \| `neededBy`                           | `assignedAt` |
| `sortOrder`  | `asc` \| `desc`                                      | `desc`       |
| `status`     | enum `AssignmentStatus`                              | —            |
| `urgency`    | enum `UrgencyLevel` (request-level filter)           | —            |
| `bloodGroup` | enum `BloodGroup` (request-level filter)             | —            |
| `searchTerm` | matches `patientName` / `hospitalName` (insensitive) | —            |

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "message": "Donation history retrieved successfully",
  "meta": {
    "page": 1,
    "limit": 6,
    "total": 2,
    "totalPages": 1,
    "totalPage": 1
  },
  "data": [
    {
      "id": "9b1c4a77-4e61-42a9-8b3c-76f3a2d1c905",
      "donorId": "5274a612-2625-46e1-b2ec-7e218a5c0825",
      "requestId": "2436a8f5-f3ce-43f1-9b07-702b0e343338",
      "status": "COMPLETED",
      "notifiedAt": "2026-10-05T16:20:00.000Z",
      "respondedAt": "2026-10-05T16:30:00.000Z",
      "createdAt": "2026-10-05T16:20:00.000Z",
      "request": {
        "id": "2436a8f5-f3ce-43f1-9b07-702b0e343338",
        "patientName": "Karin Chowdhury",
        "patientAge": 40,
        "bloodGroup": "AB_POSITIVE",
        "unitsRequired": 2,
        "hospitalName": "Square Hospital",
        "hospitalAddress": "Panthapath, Dhaka",
        "district": "Dhaka",
        "city": "Dhaka",
        "urgency": "EMERGENCY",
        "status": "COMPLETED",
        "neededBy": "2026-10-10T14:00:00.000Z",
        "isLogisticsPaid": false,
        "notes": "Elective surgery",
        "createdAt": "2026-10-05T16:00:00.000Z"
      }
    }
  ]
}
```

---

## Module 5: bKash Tokenized Payments (`/payments`)

`POST /payments/initiate` and `POST /payments/execute` are additionally rate limited by
`authPaymentRateLimiter` (**30 req / 15 min / IP**). Route order note: `/mine` is declared
before `/:id` so `mine` is never captured as an identifier.

Payment flow:

1. Frontend calls **initiate** → receives `paymentID` + `bkashURL`
2. User completes checkout on bKash; bKash redirects the browser to
   `BKASH_CALLBACK_URL` (defaults to `{FRONTEND_URL}/payment/callback`) — this is a
   **frontend** page, not an API route
3. Frontend reads `paymentID` from the callback URL and calls **execute**

### 5.1 Initiate Payment

- **Endpoint**: `POST /payments/initiate`
- **Auth**: Authenticated (`PATIENT`, `ADMIN`) — service enforces that a non-admin may
  only pay for their own blood request (`403 "You are not allowed to pay for this blood request"`)
- **Description**: Calls bKash Tokenized Checkout `create` and persists a payment row with
  `status: INITIALIZED`.

#### Request Body

```json
{
  "requestId": "2436a8f5-f3ce-43f1-9b07-702b0e343338",
  "paymentType": "EMERGENCY_LOGISTICS",
  "amount": 300
}
```

| Field         | Rules                                                 |
| :------------ | :---------------------------------------------------- |
| `requestId`   | UUID — existing, non-deleted blood request            |
| `paymentType` | enum: `PREMIUM_NOTIFICATION` \| `EMERGENCY_LOGISTICS` |
| `amount`      | number, greater than zero                             |

#### Success Response (`201 Created`)

```json
{
  "success": true,
  "message": "Payment initiated successfully",
  "data": {
    "paymentID": "TR0011z5cUnGn1789800375893",
    "bkashURL": "https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/bKash/create?paymentID=TR0011z5cUnGn1789800375893",
    "payment": {
      "id": "aa081669-774d-41cf-a49e-7d4f3cff1164",
      "status": "INITIALIZED",
      "paymentType": "EMERGENCY_LOGISTICS",
      "amount": 300,
      "currency": "BDT",
      "requestId": "2436a8f5-f3ce-43f1-9b07-702b0e343338"
    }
  }
}
```

Errors: `404 "Blood request not found"`, `502 "bKash payment creation failed: ..."`.

---

### 5.2 Execute Payment

- **Endpoint**: `POST /payments/execute`
- **Auth**: Authenticated (`PATIENT`, `ADMIN`) — ownership enforced
- **Description**: Executes the bKash payment. On success the payment becomes
  `COMPLETED`, the matching flag on the blood request is set
  (`isPremiumNotificationPaid` / `isLogisticsPaid`), a `PAYMENT_COMPLETED` audit log is
  written, and a PDF invoice is generated and emailed (outside the DB transaction).

#### Request Body

```json
{
  "paymentID": "TR0011z5cUnGn1789800375893"
}
```

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "message": "Payment executed successfully",
  "data": {
    "id": "aa081669-774d-41cf-a49e-7d4f3cff1164",
    "paymentID": "TR0011z5cUnGn1789800375893",
    "trxID": "7A8901BC99",
    "status": "COMPLETED",
    "paymentType": "EMERGENCY_LOGISTICS",
    "amount": 300,
    "currency": "BDT",
    "paidAt": "2026-10-05T16:45:00.000Z",
    "requestId": "2436a8f5-f3ce-43f1-9b07-702b0e343338",
    "message": "Payment completed successfully"
  }
}
```

Errors: `404 "Payment not found"`, `403 "You are not allowed to access this payment"`,
`502 "bKash payment not completed. Status: ..."` (payment marked `FAILED`).

---

### 5.3 Refund Emergency Logistics Payment

- **Endpoint**: `POST /payments/refund/:requestId`
- **Auth**: Authenticated (`ADMIN` only)
- **Params**: `requestId` — UUID of the blood request
- **Description**: Finds the latest **COMPLETED** `EMERGENCY_LOGISTICS` payment for the
  request, calls the bKash refund API, marks the payment `CANCELLED` with refund details,
  resets `isLogisticsPaid` to `false`, and writes a `PAYMENT_REFUNDED` audit log.

#### Request Body

```json
{
  "reason": "Courier failed to deliver the blood to the hospital"
}
```

| Field    | Rules                      |
| :------- | :------------------------- |
| `reason` | non-empty string, required |

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "message": "Payment refunded successfully",
  "data": {
    "id": "aa081669-774d-41cf-a49e-7d4f3cff1164",
    "paymentID": "TR0011z5cUnGn1789800375893",
    "trxID": "7A8901BC99",
    "status": "CANCELLED",
    "refundTrxId": "RF88102931",
    "refundAmount": 300,
    "refundReason": "Courier failed to deliver the blood to the hospital",
    "refundedAt": "2026-10-06T10:00:00.000Z",
    "message": "Payment refunded successfully"
  }
}
```

Errors: `404 "Completed logistics payment not found for this request"`,
`400 "Cannot refund payment without a bKash transaction ID"`,
`502 "bKash refund failed: ..."`.

---

### 5.4 Get My Payments

- **Endpoint**: `GET /payments/mine`
- **Auth**: Authenticated (`PATIENT`, `ADMIN`)
- **Description**: Payment history of the logged-in user, newest first.

#### Query Parameters

| Param         | Type / Rules                                        | Default     |
| :------------ | :-------------------------------------------------- | :---------- |
| `page`        | integer ≥ 1                                         | `1`         |
| `limit`       | integer 1–100                                       | `10`        |
| `sortBy`      | `createdAt` \| `amount`                             | `createdAt` |
| `sortOrder`   | `asc` \| `desc`                                     | `desc`      |
| `status`      | enum `PaymentStatus`                                | —           |
| `paymentType` | `PREMIUM_NOTIFICATION` \| `EMERGENCY_LOGISTICS`     | —           |
| `searchTerm`  | matches `paymentID`, `trxID`, request `patientName` | —           |

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "message": "Payments retrieved successfully",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "totalPages": 1,
    "totalPage": 1
  },
  "data": [
    {
      "id": "aa081669-774d-41cf-a49e-7d4f3cff1164",
      "userId": "3f0c9d1e-7b2a-4c58-9f31-2a6b5d4e8f90",
      "requestId": "2436a8f5-f3ce-43f1-9b07-702b0e343338",
      "paymentGateway": "bkash",
      "paymentID": "TR0011z5cUnGn1789800375893",
      "trxID": "7A8901BC99",
      "amount": 300,
      "currency": "BDT",
      "status": "COMPLETED",
      "paymentType": "EMERGENCY_LOGISTICS",
      "paidAt": "2026-10-05T16:45:00.000Z",
      "createdAt": "2026-10-05T16:40:00.000Z",
      "request": {
        "id": "2436a8f5-f3ce-43f1-9b07-702b0e343338",
        "patientName": "Karin Chowdhury",
        "bloodGroup": "AB_POSITIVE",
        "hospitalName": "Square Hospital",
        "district": "Dhaka",
        "city": "Dhaka",
        "status": "IN_PROGRESS"
      }
    }
  ]
}
```

---

### 5.5 Get Payment Details By ID

- **Endpoint**: `GET /payments/:id`
- **Auth**: Authenticated (`PATIENT`, `ADMIN`) — ownership enforced (admins can read any)
- **Params**: `id` — either the **DB payment UUID** or the **bKash `paymentID`**
- **Description**: Detailed payment incl. payer and blood request summaries.

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "message": "Payment details retrieved successfully",
  "data": {
    "id": "aa081669-774d-41cf-a49e-7d4f3cff1164",
    "userId": "3f0c9d1e-7b2a-4c58-9f31-2a6b5d4e8f90",
    "requestId": "2436a8f5-f3ce-43f1-9b07-702b0e343338",
    "paymentGateway": "bkash",
    "paymentID": "TR0011z5cUnGn1789800375893",
    "trxID": "7A8901BC99",
    "amount": 300,
    "currency": "BDT",
    "status": "COMPLETED",
    "paymentType": "EMERGENCY_LOGISTICS",
    "paidAt": "2026-10-05T16:45:00.000Z",
    "payerReference": "rahim@example.com",
    "createdAt": "2026-10-05T16:40:00.000Z",
    "user": {
      "id": "3f0c9d1e-7b2a-4c58-9f31-2a6b5d4e8f90",
      "name": "Rahim Uddin",
      "email": "rahim@example.com",
      "phone": "+8801700000000"
    },
    "request": {
      "id": "2436a8f5-f3ce-43f1-9b07-702b0e343338",
      "patientName": "Karin Chowdhury",
      "bloodGroup": "AB_POSITIVE",
      "hospitalName": "Square Hospital",
      "district": "Dhaka",
      "city": "Dhaka",
      "status": "IN_PROGRESS"
    }
  }
}
```

Errors: `404 "Payment not found"`, `403 "You are not allowed to access this payment"`.

---

## Module 6: Admin Administration & Audit Analytics (`/admin`)

Every endpoint requires the `ADMIN` role.

### 6.1 Get All Users (Admin User Management)

- **Endpoint**: `GET /admin/users`
- **Auth**: Authenticated (`ADMIN`)

#### Query Parameters

| Param        | Type / Rules                               | Default     |
| :----------- | :----------------------------------------- | :---------- |
| `page`       | integer ≥ 1                                | `1`         |
| `limit`      | integer 1–100                              | `10`        |
| `sortBy`     | `name` \| `email` \| `role` \| `createdAt` | `createdAt` |
| `sortOrder`  | `asc` \| `desc`                            | `desc`      |
| `role`       | enum `UserRole`                            | —           |
| `bloodGroup` | enum `BloodGroup`                          | —           |
| `district`   | trimmed string                             | —           |
| `searchTerm` | matches `name` / `email` (insensitive)     | —           |

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 120,
    "totalPages": 12,
    "totalPage": 12
  },
  "data": [
    {
      "id": "3f0c9d1e-7b2a-4c58-9f31-2a6b5d4e8f90",
      "name": "Rahim Uddin",
      "email": "rahim@example.com",
      "phone": "+8801700000000",
      "role": "DONOR",
      "bloodGroup": "O_POSITIVE",
      "district": "Dhaka",
      "city": "Dhaka",
      "address": "Mirpur-10",
      "isAvailable": true,
      "status": "ACTIVE",
      "lastDonatedAt": null,
      "avatarUrl": null,
      "isEmailVerified": true,
      "isDeleted": false,
      "createdAt": "2026-01-10T08:00:00.000Z",
      "updatedAt": "2026-01-10T08:00:00.000Z",
      "_count": { "bloodRequests": 3, "donorAssignments": 2, "payments": 4 }
    }
  ]
}
```

> Passwords are never returned.

---

### 6.2 Get All Payments (Admin)

- **Endpoint**: `GET /admin/payments`
- **Auth**: Authenticated (`ADMIN`)
- **Description**: Platform-wide payment list with payer and request summaries.

#### Query Parameters

| Param         | Type / Rules                                              | Default     |
| :------------ | :-------------------------------------------------------- | :---------- |
| `page`        | integer ≥ 1                                               | `1`         |
| `limit`       | integer 1–100                                             | `10`        |
| `sortBy`      | `createdAt` \| `amount`                                   | `createdAt` |
| `sortOrder`   | `asc` \| `desc`                                           | `desc`      |
| `status`      | enum `PaymentStatus`                                      | —           |
| `paymentType` | enum `PaymentType` (full enum)                            | —           |
| `searchTerm`  | matches `paymentID`, `trxID`, payer `email` (insensitive) | —           |

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "message": "Payments retrieved successfully",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5,
    "totalPage": 5
  },
  "data": [
    {
      "id": "aa081669-774d-41cf-a49e-7d4f3cff1164",
      "userId": "3f0c9d1e-7b2a-4c58-9f31-2a6b5d4e8f90",
      "requestId": "2436a8f5-f3ce-43f1-9b07-702b0e343338",
      "paymentGateway": "bkash",
      "paymentID": "TR0011z5cUnGn1789800375893",
      "trxID": "7A8901BC99",
      "amount": 300,
      "currency": "BDT",
      "status": "COMPLETED",
      "paymentType": "EMERGENCY_LOGISTICS",
      "paidAt": "2026-10-05T16:45:00.000Z",
      "createdAt": "2026-10-05T16:40:00.000Z",
      "user": {
        "id": "3f0c9d1e-7b2a-4c58-9f31-2a6b5d4e8f90",
        "name": "Rahim Uddin",
        "email": "rahim@example.com",
        "avatarUrl": null
      },
      "request": {
        "id": "2436a8f5-f3ce-43f1-9b07-702b0e343338",
        "patientName": "Karin Chowdhury",
        "bloodGroup": "AB_POSITIVE",
        "hospitalName": "Square Hospital",
        "status": "IN_PROGRESS"
      }
    }
  ]
}
```

---

### 6.3 Update User Role / Status / Delete Flag

- **Endpoint**: `PATCH /admin/users/:id/role`
- **Auth**: Authenticated (`ADMIN`)
- **Params**: `id` — target user UUID
- **Description**: Changes `role`, `status`, and/or `isDeleted` on a target user and writes
  an audit log (`USER_ROLE_UPDATED` / `USER_BLOCKED` / `USER_UPDATED`) with the admin id and IP.

#### Request Body (all optional — send at least one meaningful change)

```json
{
  "role": "ADMIN",
  "status": "ACTIVE",
  "isDeleted": false
}
```

| Field       | Rules                                                  |
| :---------- | :----------------------------------------------------- |
| `role`      | enum `UserRole` (`DONOR` \| `PATIENT` \| `ADMIN`)      |
| `status`    | enum `UserStatus` (`ACTIVE` \| `BLOCKED` \| `DELETED`) |
| `isDeleted` | boolean                                                |

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": "5274a612-2625-46e1-b2ec-7e218a5c0825",
    "name": "Tareq Boy",
    "email": "boy.tareq244@gmail.com",
    "role": "PATIENT",
    "isDeleted": false,
    "status": "ACTIVE"
  }
}
```

#### Business Errors

| Status | Message                                                         |
| :----- | :-------------------------------------------------------------- |
| `400`  | `"You cannot change your own role or block yourself"`           |
| `404`  | `"User not found"`                                              |
| `400`  | `"No changes detected. Provide a new role or isDeleted value."` |

---

### 6.4 Get Admin Analytics Dashboard Stats

- **Endpoint**: `GET /admin/dashboard-stats`
- **Auth**: Authenticated (`ADMIN`)
- **Description**: Computes all aggregates concurrently (`Promise.all`). Counts exclude
  soft-deleted users/requests; revenue only includes `COMPLETED` payments.

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "message": "Dashboard statistics retrieved successfully",
  "data": {
    "totalUsers": 125,
    "usersByRole": { "DONOR": 90, "PATIENT": 30, "ADMIN": 5 },
    "totalBloodRequests": 45,
    "bloodRequestsByStatus": {
      "PENDING": 10,
      "VERIFIED": 15,
      "DONOR_ASSIGNED": 5,
      "IN_PROGRESS": 10,
      "COMPLETED": 3,
      "CANCELLED": 2
    },
    "totalCompletedDonations": 8,
    "payments": {
      "totalCompletedPayments": 9,
      "totalRevenue": 4500,
      "currency": "BDT"
    }
  }
}
```

---

### 6.5 Get System Audit Logs

- **Endpoint**: `GET /admin/audit-logs`
- **Auth**: Authenticated (`ADMIN`)
- **Description**: Paginated audit trail; each row includes the acting user summary
  (`id`, `name`, `email`, `role`).

#### Query Parameters

| Param        | Type / Rules                                                                                                                                         | Default     |
| :----------- | :--------------------------------------------------------------------------------------------------------------------------------------------------- | :---------- |
| `page`       | integer ≥ 1                                                                                                                                          | `1`         |
| `limit`      | integer 1–100                                                                                                                                        | `10`        |
| `sortBy`     | only `createdAt`                                                                                                                                     | `createdAt` |
| `sortOrder`  | `asc` \| `desc`                                                                                                                                      | `desc`      |
| `action`     | exact match (e.g. `STATUS_CHANGE`, `PAYMENT_COMPLETED`, `USER_ROLE_UPDATED`, `DONOR_ACCEPTED`, `DONOR_DECLINED`, `PAYMENT_REFUNDED`, `USER_BLOCKED`) | —           |
| `entity`     | exact match (e.g. `User`, `BloodRequest`, `Payment`)                                                                                                 | —           |
| `actorEmail` | matches actor email (insensitive contains)                                                                                                           | —           |

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "message": "Audit logs retrieved successfully",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5,
    "totalPage": 5
  },
  "data": [
    {
      "id": "6c2f0c1d-9a44-4f0b-b7f1-0d4a5e2b3c11",
      "userId": "e4d1a2b3-1111-2222-3333-444455556666",
      "action": "USER_ROLE_UPDATED",
      "entity": "User",
      "entityId": "5274a612-2625-46e1-b2ec-7e218a5c0825",
      "details": {
        "from": { "role": "DONOR", "status": "ACTIVE", "isDeleted": false },
        "to": { "role": "PATIENT" }
      },
      "ipAddress": "127.0.0.1",
      "createdAt": "2026-10-05T16:10:00.000Z",
      "user": {
        "id": "e4d1a2b3-1111-2222-3333-444455556666",
        "name": "Site Admin",
        "email": "testeradmin@gmail.com",
        "role": "ADMIN"
      }
    }
  ]
}
```

---

## Module 7: In-App Notifications (`/notifications`)

Persistent, per-user notification records produced either by admin action or (in future) by domain events (donor assignment, request lifecycle, payment lifecycle).

### 7.1 Create Notification

- **Endpoint**: `POST /notifications`
- **Auth**: Authenticated (`ADMIN` only)
- **Description**: Creates a notification for the target user. The target user must exist and must not be soft-deleted.

#### Request Body

```json
{
  "userId": "5274a612-2625-46e1-b2ec-7e218a5c0825",
  "type": "GENERAL",
  "title": "Welcome to Hemacue",
  "message": "Thanks for joining the platform. Complete your profile to become discoverable.",
  "relatedEntityType": "BloodRequest",
  "relatedEntityId": "2436a8f5-f3ce-43f1-9b07-702b0e343338"
}
```

| Field               | Rules                                                                |
| :------------------ | :------------------------------------------------------------------- |
| `userId`            | UUID — must reference an existing, non-deleted user                  |
| `type`              | enum `NotificationType`, optional (defaults to `GENERAL`)            |
| `title`             | string, required, 1–200 chars                                        |
| `message`           | string, required, 1–2000 chars                                       |
| `relatedEntityType` | string, optional (e.g. `BloodRequest`, `Payment`, `DonorAssignment`) |
| `relatedEntityId`   | string, optional                                                     |

#### Success Response (`201 Created`)

```json
{
  "success": true,
  "message": "Notification created successfully",
  "data": {
    "id": "a6f3b1c2-84d1-4e22-9c3f-8d1e2a4b5c67",
    "userId": "5274a612-2625-46e1-b2ec-7e218a5c0825",
    "type": "GENERAL",
    "title": "Welcome to Hemacue",
    "message": "Thanks for joining the platform. Complete your profile to become discoverable.",
    "isRead": false,
    "relatedEntityType": "BloodRequest",
    "relatedEntityId": "2436a8f5-f3ce-43f1-9b07-702b0e343338",
    "createdAt": "2026-10-06T12:00:00.000Z",
    "updatedAt": "2026-10-06T12:00:00.000Z"
  }
}
```

Errors: `404 "Target user not found"`, `400 "Cannot create a notification for a deleted user"`.

---

### 7.2 Get My Notifications

- **Endpoint**: `GET /notifications`
- **Auth**: Authenticated (`DONOR`, `PATIENT`, `ADMIN`)
- **Description**: Paginated list of the calling user's own notifications, newest first. **Admins do not see other users' notifications here** — this endpoint is strictly scoped to `userId = current user`.

#### Query Parameters

| Param        | Type / Rules                                       | Default     |
| :----------- | :------------------------------------------------- | :---------- |
| `page`       | integer ≥ 1                                        | `1`         |
| `limit`      | integer 1–100                                      | `10`        |
| `sortBy`     | only `createdAt`                                   | `createdAt` |
| `sortOrder`  | `asc` \| `desc`                                    | `desc`      |
| `type`       | enum `NotificationType`                            | —           |
| `isRead`     | `"true"` \| `"false"`                              | —           |
| `searchTerm` | matches `title` / `message` (insensitive contains) | —           |

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "message": "Notifications retrieved successfully",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1,
    "totalPage": 1
  },
  "data": [
    {
      "id": "a6f3b1c2-84d1-4e22-9c3f-8d1e2a4b5c67",
      "userId": "5274a612-2625-46e1-b2ec-7e218a5c0825",
      "type": "GENERAL",
      "title": "Welcome to Hemacue",
      "message": "Thanks for joining the platform. Complete your profile to become discoverable.",
      "isRead": false,
      "relatedEntityType": "BloodRequest",
      "relatedEntityId": "2436a8f5-f3ce-43f1-9b07-702b0e343338",
      "createdAt": "2026-10-06T12:00:00.000Z",
      "updatedAt": "2026-10-06T12:00:00.000Z"
    }
  ]
}
```

---

## Common System Enums

Source of truth: `prisma/schema/enums.prisma`

### UserRole

`DONOR`, `PATIENT`, `ADMIN`

### UserStatus

`ACTIVE`, `BLOCKED`, `DELETED`

### AuthProvider

`GOOGLE`, `CREDENTIAL`

### BloodGroup

`A_POSITIVE`, `A_NEGATIVE`, `B_POSITIVE`, `B_NEGATIVE`, `AB_POSITIVE`, `AB_NEGATIVE`, `O_POSITIVE`, `O_NEGATIVE`

### UrgencyLevel

`NORMAL`, `HIGH`, `EMERGENCY`

### RequestStatus

`PENDING`, `VERIFIED`, `DONOR_ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`

### AssignmentStatus

`NOTIFIED`, `ACCEPTED`, `DECLINED`, `COMPLETED`, `CANCELLED`

### PaymentStatus

`INITIALIZED`, `COMPLETED`, `FAILED`, `CANCELLED`

### PaymentType

`PREMIUM_NOTIFICATION`, `EMERGENCY_LOGISTICS`

### NotificationType

`DONOR_ASSIGNED`, `REQUEST_ACCEPTED`, `REQUEST_DECLINED`, `REQUEST_VERIFIED`, `REQUEST_COMPLETED`, `REQUEST_CANCELLED`, `PAYMENT_COMPLETED`, `PAYMENT_REFUNDED`, `GENERAL`

---

## 10. Common Error Catalog

Frequently returned errors (message is always accompanied by `errors[]`):

| HTTP | Message                                                                           | Where                         |
| :--- | :-------------------------------------------------------------------------------- | :---------------------------- |
| 400  | `Validation Error` (+ per-field messages)                                         | any Zod `validateRequest`     |
| 400  | `Invalid or expired OTP` / `OTP does not match`                                   | verify-email / reset-password |
| 400  | `Cannot change request status from X to Y`                                        | status state machine          |
| 400  | `Cannot assign donor to a request that is not verified`                           | assign-donor                  |
| 400  | `No changes detected. Provide a new role or isDeleted value.`                     | admin role update             |
| 401  | `You are not logged in. Please log in to access this resource.`                   | missing token                 |
| 401  | `Invalid email or password`                                                       | login                         |
| 401  | `Refresh token is missing`                                                        | refresh-token                 |
| 403  | `Forbidden. You don't have permission to access this resource.`                   | role mismatch                 |
| 403  | `Your account has been deleted or blocked.`                                       | auth middleware (isDeleted)   |
| 403  | `You are not allowed to update this blood request`                                | blood request update/delete   |
| 403  | `You are not allowed to pay for this blood request`                               | payment initiate              |
| 404  | `API Not Found`                                                                   | unknown route                 |
| 404  | `Blood request not found` / `Payment not found` / `User not found`                | entity lookups                |
| 409  | `Another donor has already accepted this request`                                 | donor respond                 |
| 409  | `Email is already verified`                                                       | verify-email                  |
| 429  | `Too many auth/payment attempts from this IP, please try again after 15 minutes.` | auth/payment limiter          |
| 429  | `Too many requests from this IP, please try again after 15 minutes.`              | global limiter                |
| 502  | `bKash payment creation failed: ...` / `bKash refund failed: ...`                 | payment gateway               |
