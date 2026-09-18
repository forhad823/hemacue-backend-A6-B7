# Hemacue Backend — API Overview

> Comprehensive request/response documentation for every implemented API endpoint, grouped by module.
>
> **Base URL:** `http://localhost:5000/api/v1`
> **Auth pattern:** `Authorization: Bearer <accessToken>` (JWT) — also accepted as an `accessToken` httpOnly cookie set at login.
> **Response envelope (all endpoints):**
>
> ```json
> {
>   "success": true,
>   "message": "Human readable message",
>   "meta": {
>     "page": 1,
>     "limit": 10,
>     "total": 0,
>     "totalPages": 0,
>     "totalPage": 0
>   },
>   "data": {}
> }
> ```
>
> **Error envelope:** `{ "success": false, "message": "...", "errors": [{ "path": "", "message": "..." }], "stack": "..." }`

---

## Contents

1. [Auth Module](#1-auth-module)
2. [User Module](#2-user-module)
3. [Blood Request Module](#3-blood-request-module)
4. [Donor Matching Module](#4-donor-matching-module)
5. [Payment Module (bKash)](#5-payment-module-bkash)
6. [Admin Module](#6-admin-module)
7. [Common Enums](#7-common-enums)

---

## 1. Auth Module

Rate limited by `authPaymentRateLimiter` — **10 requests / 15 minutes / IP** (`429` when exceeded).

### 1.1 Register user

- **`POST /auth/register`** — Public
- **Body:**

```json
{
  "name": "Rahim Uddin",
  "email": "rahim@gmail.com",
  "password": "Rahim@1234",
  "role": "DONOR",
  "bloodGroup": "O_POSITIVE",
  "phone": "01700000000",
  "district": "Dhaka",
  "city": "Dhaka",
  "address": "Mirpur 10"
}
```

- `role`: `DONOR` | `PATIENT` (default `DONOR`)
- `password`: ≥6 chars, must contain 1 lowercase, 1 uppercase, 1 number, 1 special char
- **Success (201):** OTP sent to email.

```json
{ "success": true, "message": "Verification OTP Sent to email", "data": null }
```

- **Errors:** 400 (validation/invalid), 409 (email already exists).

### 1.2 Verify email (complete registration)

- **`POST /auth/verify-email`** — Authenticated (uses OTP)
- **Body:**

```json
{ "email": "rahim@gmail.com", "otp": "123456" }
```

- **Success (200):** account created + login tokens; sets `accessToken`/`refreshToken` cookies.

```json
{
  "success": true,
  "message": "Email Verified Successfully",
  "data": {
    "user": {
      "id": "",
      "name": "",
      "email": "",
      "role": "DONOR",
      "bloodGroup": "O_POSITIVE",
      "...": "..."
    },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

- **Errors:** 400 (invalid/expired OTP), 403 (blocked).

### 1.3 Login

- **`POST /auth/login`** — Public
- **Body:** `{ "email": "testeradmin@gmail.com", "password": "Tester@admin12345" }`
- **Success (200):**

```json
{
  "success": true,
  "message": "User logged in successfully",
  "data": { "accessToken": "eyJ...", "refreshToken": "eyJ..." }
}
```

### 1.4 Refresh token

- **`POST /auth/refresh-token`** — Public
- **Body (or cookie):** `{ "refreshToken": "eyJ..." }` (also read from `refreshToken` cookie if body absent)
- **Success (200):** rotated `{ accessToken, refreshToken }`.
- **Errors:** 401 (missing/invalid refresh token).

### 1.5 Google login

- **`POST /auth/google-login`** — Public
- **Body:** `{ "idToken": "<google-id-token>" }`
- **Success (200):** creates/logs user via Google OAuth → `{ accessToken, refreshToken }`.

### 1.6 Forgot password

- **`POST /auth/forgot-password`** — Public
- **Body:** `{ "email": "rahim@gmail.com" }`
- **Success (200):** reset OTP emailed.

```json
{
  "success": true,
  "message": "OTP Sent To Email: rahim@gmail.com",
  "data": null
}
```

### 1.7 Reset password

- **`POST /auth/reset-password`** — Public
- **Body:**

```json
{ "email": "rahim@gmail.com", "otp": "123456", "newPassword": "NewPass@123" }
```

- **Success (200):** `{ "message": "Password Changed Successfully", "data": null }`

---

## 2. User Module

All endpoints: authenticated (DONOR / PATIENT / ADMIN).

### 2.1 Get current profile

- **`GET /users/me`**
- **Success (200):**

```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "id": "...",
    "name": "Tester Donor 3",
    "email": "donor-3@gmail.com",
    "role": "DONOR",
    "bloodGroup": "O_NEGATIVE",
    "phone": null,
    "district": null,
    "city": null,
    "address": null,
    "latitude": null,
    "longitude": null,
    "isAvailable": true,
    "status": "ACTIVE",
    "lastDonatedAt": "2026-06-02T00:00:00.000Z",
    "avatarUrl": null,
    "authProvider": "CREDENTIAL",
    "isEmailVerified": true,
    "createdAt": "...",
    "updatedAt": "...",
    "totalBloodRequests": 0,
    "totalCompletedDonations": 0
  }
}
```

- **Errors:** 401, 403 (blocked), 404 (deleted user).

### 2.2 Update profile

- **`PATCH /users/me`**
- **Body (all optional):**

```json
{
  "name": "Tester Donor 3",
  "phone": "01700000000",
  "district": "Dhaka",
  "city": "Dhaka",
  "address": "Uttara",
  "latitude": 23.87,
  "longitude": 90.38,
  "isAvailable": true,
  "lastDonatedAt": "2026-06-02T00:00:00.000Z",
  "bloodGroup": "O_NEGATIVE"
}
```

- **Cooldown rule:** setting `lastDonatedAt` within the last 90 days forces `isAvailable=false`.
- **Success (200):** updated user object.

### 2.3 Upload avatar

- **`PATCH /users/me/avatar`** — `multipart/form-data`, field name **`avatar`**
- **Success (200):**

```json
{
  "success": true,
  "message": "Avatar uploaded successfully",
  "data": {
    "id": "...",
    "name": "...",
    "email": "...",
    "avatarUrl": "https://res.cloudinary.com/..."
  }
}
```

- **Errors:** 400 (no file).

---

## 3. Blood Request Module

### 3.1 Create blood request

- **`POST /blood-requests`** — PATIENT, ADMIN
- **Body:**

```json
{
  "patientName": "Rahim",
  "patientAge": 34,
  "bloodGroup": "O_POSITIVE",
  "unitsRequired": 2,
  "hospitalName": "Dhaka Medical College Hospital",
  "hospitalAddress": "Shahbag, Dhaka",
  "district": "Dhaka",
  "city": "Dhaka",
  "latitude": 23.73,
  "longitude": 90.4,
  "urgency": "EMERGENCY",
  "neededBy": "2026-10-01T12:00:00.000Z",
  "notes": "urgent"
}
```

- Required: `patientName` (≥2), `patientAge` (int 1–120), `bloodGroup`, `hospitalName`, `hospitalAddress`, `district`, `city`, `neededBy` (ISO datetime)
- Optional: `unitsRequired` (int ≥1, default 1), `latitude`, `longitude`, `urgency` (default `NORMAL`), `notes`
- **Success (201):** full request object with `status: "PENDING"`.

### 3.2 List blood requests

- **`GET /blood-requests`** — Public
- **Query (all optional):**
  - `page` ≥1 (default 1), `limit` 1–100 (default 10)
  - `sortBy`: `createdAt` | `updatedAt` | `neededBy` | `patientName` | `bloodGroup` | `urgency`
  - `sortOrder`: `asc` | `desc` (default `desc`)
  - `bloodGroup`, `district`, `urgency`, `status` filters
  - `searchTerm` — matches `hospitalName`, `patientName`, `city`
- **Success (200):** `meta` (page/limit/total/totalPages/totalPage) + array of requests (excludes soft-deleted).

### 3.3 My requests

- **`GET /blood-requests/my-requests`** — PATIENT, ADMIN
- Same query params as 3.2, scoped to the authenticated requester.

### 3.4 Get request by id

- **`GET /blood-requests/:id`** — Public
- **Params:** `id` (request UUID)
- **Success (200):** request detail including `requester` (name/email/phone/bloodGroup) and `assignments[]` (each with donor profile, status, timestamps).

### 3.5 Update request

- **`PATCH /blood-requests/:id`** — Creator (owner) or ADMIN
- **Params:** `id` | **Body:** any subset of the create fields (all optional, e.g. `{ "hospitalName": "Square Hospital", "unitsRequired": 3 }`)
- **Success (200):** updated request.

### 3.6 Soft delete request

- **`DELETE /blood-requests/:id`** — Creator (owner) or ADMIN
- **Success (200):** `{ "message": "Blood request deleted successfully", "data": null }` — sets `isDeleted=true`; subsequent reads/list return 404 / exclude it.

---

## 4. Donor Matching Module

### 4.1 Find compatible donors

- **`GET /donor-matches/compatible-donors`** — PATIENT, ADMIN
- **Query:**
  - `bloodGroup` **(required)** — patient's group; recipients are matched via the medical compatibility matrix
  - `district` (optional) — filter donors by district
  - `requestId` (optional UUID) — excludes donors already assigned to that request
- **Success (200):**

```json
{
  "success": true,
  "message": "Compatible donors retrieved successfully",
  "data": [
    {
      "id": "...",
      "name": "...",
      "email": "...",
      "phone": "...",
      "bloodGroup": "O_NEGATIVE",
      "district": "...",
      "city": "...",
      "address": "...",
      "isAvailable": true,
      "lastDonatedAt": "2026-06-02T00:00:00.000Z",
      "avatarUrl": null
    }
  ]
}
```

- **Compatibility matrix:** e.g. patient `O_POSITIVE` accepts donors `[O_POSITIVE, O_NEGATIVE]`; `AB_POSITIVE` accepts all; donor `O_NEGATIVE` only accepts `O_NEGATIVE`. Filters: role=DONOR, `isAvailable`, not deleted, `lastDonatedAt` null or >90 days ago.
- **Errors:** 400 (invalid bloodGroup / non-verifiable input).

### 4.2 Assign donor for a blood-request

- **`POST /donor-matches/assign-donor`** — PATIENT, ADMIN
- **Query:**
  - `requestId` **(required)** — the Blood request Id
  - `donorID` **(required)** - a compatible donor's id according to the request
- **Success (200):**

```json
{
  "success": true,
  "message": "Donor assigned successfully",
  "data": {
    "id": "...",
    "requestId": "...",
    "donorId": "...",
    "status": "NOTIFIED",
    "assignedAt": "2026-09-18T13:38:14.287Z",
    "respondedAt": null
  }
}
```
**Errors:** 400 (request not verified

### 4.3 Donor respond (accept / decline)

- **`POST /blood-requests/:id/respond`** — DONOR
- **Params:** `id` (request UUID)
- **Body:**

```json
{ "response": "ACCEPTED" }
```

- `response`: `ACCEPTED` | `DECLINED`
- **Requires an existing `NOTIFIED` assignment** for this donor + request.
- **ACCEPTED** → assignment `ACCEPTED`, other `NOTIFIED` assignments cancelled, request `VERIFIED → DONOR_ASSIGNED`, audit log `DONOR_ACCEPTED`.
- **DECLINED** → assignment `DECLINED`, audit log `DONOR_DECLINED`.
- **Errors:** 400 (request not verified / closed), 404 (not assigned), 409 (already responded / taken).


### 4.4 Update request status (state machine)

- **`PATCH /blood-requests/:id/status`** — Requester (owner) or ADMIN
- **Params:** `id` | **Body:** `{ "status": "VERIFIED" }`
- Allowed:

```text
PENDING        → VERIFIED | CANCELLED
VERIFIED       → CANCELLED
DONOR_ASSIGNED → IN_PROGRESS | CANCELLED
IN_PROGRESS    → COMPLETED | CANCELLED
COMPLETED      → (none)
CANCELLED      → (none)
```

- **On COMPLETED:** accepted assignment → `COMPLETED`, donor `lastDonatedAt = now`, `isAvailable = false`.
- **On CANCELLED:** NOTIFIED/ACCEPTED assignments → `CANCELLED`.
- Every transition writes an `AuditLog` (`STATUS_CHANGE`).
- **Errors:** 400 (invalid transition), 403 (not owner/admin), 404.

### 4.5 My donations

- **`GET /donor-matches/my-donations`** — DONOR
- **Success (200):** array of the donor's assignments, each with request summary (patient, blood group, hospital, status, urgency, neededBy, `isLogisticsPaid`, timestamps), ordered by `assignedAt desc`.

---

## 5. Payment Module (bKash)

> Rate limited (initiate & execute): **10 requests / 15 min / IP**. All endpoints require auth.

### 5.1 Initiate payment

- **`POST /payments/initiate`** — PATIENT, ADMIN (request owner or admin)
- **Body:**

```json
{
  "requestId": "7921d5d5-6d8f-4d17-b986-9972bf6f58e2",
  "paymentType": "PREMIUM_NOTIFICATION",
  "amount": 50
}
```

- `paymentType`: `PREMIUM_NOTIFICATION` | `EMERGENCY_LOGISTICS`; `amount` > 0
- **Flow:** bKash token (grant/refresh via Redis) → `POST /tokenized/bKash/create` → persists `Payment` (`INITIALIZED`).
- **Success (201):**

```json
{
  "success": true,
  "message": "Payment initiated successfully",
  "data": {
    "paymentID": "TR0011DK7II2AAAA",
    "bkashURL": "https://sandbox.bka.sh/...",
    "payment": {
      "id": "...",
      "status": "INITIALIZED",
      "paymentType": "PREMIUM_NOTIFICATION",
      "amount": 50,
      "currency": "BDT",
      "requestId": "..."
    }
  }
}
```

- **Errors:** 400, 403, 404, 429, 502 (bKash unreachable/invalid credentials).

### 5.2 Execute payment

- **`POST /payments/execute`** — PATIENT, ADMIN (payment owner or admin)
- **Body:** `{ "paymentID": "TR0011DK7II2AAAA" }`
- **Flow:** bKash `POST /tokenized/bKash/execute` → if `transactionStatus === "Completed"` run a **Prisma transaction**: mark `Payment COMPLETED` (+ `trxID`, `paidAt`, `gatewayResponse`), flip `BloodRequest.isPremiumNotificationPaid` / `isLogisticsPaid`, write `AuditLog PAYMENT_COMPLETED`. Afterwards (outside the transaction) → generate invoice PDF + email to payer. Non-Completed → `Payment FAILED` (502).
- **Success (200):** confirmed payment (`status: "COMPLETED"`, `trxID`, `paidAt`).

### 5.3 Refund logistics payment

- **`POST /payments/refund/:requestId`** — ADMIN
- **Params:** `requestId` | **Body:** `{ "reason": "Courier could not deliver" }`
- **Flow:** finds latest `COMPLETED` + `EMERGENCY_LOGISTICS` payment → bKash `POST /tokenized/bKash/refund` → transaction: `Payment CANCELLED` (+ `refundTrxId`, `refundAmount`, `refundReason`, `refundedAt`), `BloodRequest.isLogisticsPaid = false`, `AuditLog PAYMENT_REFUNDED`.
- **Success (200):** refunded payment object.
- **Errors:** 400 (missing trxID / already refunded), 404 (no completed logistics payment), 502.

### 5.4 Get payment details

- **`GET /payments/:id`** — PATIENT, ADMIN (owner or admin)
- **Params:** `id` — DB payment UUID **or** bKash `paymentID`
- **Success (200):** full payment record with nested `user` and `request`.

---

## 6. Admin Module

All endpoints: **ADMIN only** (`401` unauthenticated, `403` non-admin).

### 6.1 List users

- **`GET /admin/users`**
- **Query (all optional):**
  - `page` (1+), `limit` (1–100)
  - `sortBy`: `name` | `email` | `role` | `createdAt`
  - `sortOrder`: `asc` | `desc`
  - `role` (`DONOR`|`PATIENT`|`ADMIN`), `bloodGroup`, `district`
  - `searchTerm` (matches name/email, case-insensitive)
- **Success (200):** `meta` + array of users, each with `_count: { bloodRequests, donorAssignments, payments }`.

### 6.2 Update role / block user

- **`PATCH /admin/users/:id/role`**
- **Params:** `id` (user UUID)
- **Body (at least one field):**

```json
{ "role": "PATIENT", "isDeleted": false }
```

- `role`: `DONOR` | `PATIENT` | `ADMIN`; `isDeleted: true` = block/soft-delete.
- **Guards:** cannot modify self (400); no-change payload (400). Writes `AuditLog USER_ROLE_UPDATED` / `USER_BLOCKED`.
- **Success (200):** `{ id, name, email, role, isDeleted, status }`.

### 6.3 Dashboard stats

- **`GET /admin/dashboard-stats`**
- **Success (200):**

```json
{
  "success": true,
  "message": "Dashboard statistics retrieved successfully",
  "data": {
    "totalUsers": 7,
    "usersByRole": { "DONOR": 3, "PATIENT": 3, "ADMIN": 1 },
    "totalBloodRequests": 4,
    "bloodRequestsByStatus": {
      "PENDING": 3,
      "VERIFIED": 0,
      "DONOR_ASSIGNED": 1,
      "IN_PROGRESS": 0,
      "COMPLETED": 0,
      "CANCELLED": 0
    },
    "totalCompletedDonations": 0,
    "payments": {
      "totalCompletedPayments": 0,
      "totalRevenue": 0,
      "currency": "BDT"
    }
  }
}
```

### 6.4 Audit logs

- **`GET /admin/audit-logs`**
- **Query (all optional):** `page`, `limit`, `sortBy` (`createdAt`), `sortOrder`, `action`, `entity`, `actorEmail`
- **Common audit actions:** `DONOR_ACCEPTED`, `DONOR_DECLINED`, `STATUS_CHANGE`, `PAYMENT_COMPLETED`, `PAYMENT_REFUNDED`, `USER_ROLE_UPDATED`, `USER_BLOCKED`, `INVOICE_EMAIL_FAILED`
- **Success (200):** `meta` + array of log entries (each includes `details`, `ipAddress`, and the acting `user`).

---

## 7. Common Enums

```text
UserRole:        DONOR | PATIENT | ADMIN
AuthProvider:    GOOGLE | CREDENTIAL
UserStatus:      ACTIVE | BLOCKED | DELETED
BloodGroup:      A_POSITIVE | A_NEGATIVE | B_POSITIVE | B_NEGATIVE
                 | AB_POSITIVE | AB_NEGATIVE | O_POSITIVE | O_NEGATIVE
UrgencyLevel:    NORMAL | HIGH | EMERGENCY
RequestStatus:   PENDING | VERIFIED | DONOR_ASSIGNED | IN_PROGRESS | COMPLETED | CANCELLED
AssignmentStatus:NOTIFIED | ACCEPTED | DECLINED | COMPLETED | CANCELLED
PaymentStatus:   INITIALIZED | COMPLETED | FAILED | CANCELLED
PaymentType:     PREMIUM_NOTIFICATION | EMERGENCY_LOGISTICS
```

---

## Postman Testing Quick Reference

**Login script** (share/refresh `accessToken`):

```http
POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "testeradmin@gmail.com",
  "password": "Tester@admin12345"
}
```

Store `data.accessToken` → `{{accessToken}}`, then add header `Authorization: Bearer {{accessToken}}`.

> For role-scoped tests: donor login `donor-3@gmail.com` / `Password123!`. To test `POST /blood-requests/:id/respond`, first insert a `NOTIFIED` `DonorAssignment` for the request+donor (no assignment-creation endpoint exists in Steps 7/8).
