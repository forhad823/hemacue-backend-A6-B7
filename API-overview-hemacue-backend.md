# Hemacue Backend — Comprehensive API Overview & Specification

> **Hemacue API Version:** `v1`  
> **Base URL:** `http://localhost:5000/api/v1`  
> **Protocol:** HTTPS / HTTP REST  
> **Data Format:** JSON (`application/json`) / Multipart (`multipart/form-data`)

---

## ⚡ At a Glance: Implemented APIs Summary

| Module            | Method   | Endpoint                                  | Access / Auth         | Description                                             |
| :---------------- | :------- | :---------------------------------------- | :-------------------- | :------------------------------------------------------ |
| **Auth**          | `POST`   | `/api/v1/auth/register`                   | Public                | Register new account & send 6-digit OTP                 |
| **Auth**          | `POST`   | `/api/v1/auth/verify-email`               | Public                | Verify OTP and issue JWT token cookies                  |
| **Auth**          | `POST`   | `/api/v1/auth/verify-email/resend-otp`    | Public                | Resend email registration OTP                           |
| **Auth**          | `POST`   | `/api/v1/auth/login`                      | Public                | Login with email & password                             |
| **Auth**          | `POST`   | `/api/v1/auth/refresh-token`              | Public / Cookie       | Rotate and refresh access token                         |
| **Auth**          | `POST`   | `/api/v1/auth/google-login`               | Public                | Sign in via Google OAuth ID Token                       |
| **Auth**          | `POST`   | `/api/v1/auth/forgot-password`            | Public                | Send password reset OTP                                 |
| **Auth**          | `POST`   | `/api/v1/auth/reset-password`             | Public                | Reset password using OTP                                |
| **Auth**          | `POST`   | `/api/v1/auth/logout`                     | Authenticated         | Logout user & clear cookies                             |
| **User**          | `GET`    | `/api/v1/users/me`                        | DONOR, PATIENT, ADMIN | Get current user profile details                        |
| **User**          | `PATCH`  | `/api/v1/users/me`                        | DONOR, PATIENT, ADMIN | Update user profile & availability toggle               |
| **User**          | `PATCH`  | `/api/v1/users/me/avatar`                 | DONOR, PATIENT, ADMIN | Upload profile image avatar to Cloudinary               |
| **Blood Request** | `POST`   | `/api/v1/blood-requests`                  | PATIENT, ADMIN        | Create new blood donation request                       |
| **Blood Request** | `GET`    | `/api/v1/blood-requests`                  | Public                | List & search requests with filters & pagination        |
| **Blood Request** | `GET`    | `/api/v1/blood-requests/my-requests`      | PATIENT, ADMIN        | Fetch requests created by logged in user                |
| **Blood Request** | `GET`    | `/api/v1/blood-requests/:id`              | Public                | Fetch detailed info for a blood request                 |
| **Blood Request** | `PATCH`  | `/api/v1/blood-requests/:id`              | PATIENT, ADMIN        | Update blood request details                            |
| **Blood Request** | `DELETE` | `/api/v1/blood-requests/:id`              | PATIENT, ADMIN        | Soft delete a blood request                             |
| **Donor Match**   | `GET`    | `/api/v1/donor-matches/compatible-donors` | PATIENT, ADMIN        | Find eligible donors (medical matrix + 90-day cooldown) |
| **Donor Match**   | `POST`   | `/api/v1/donor-matches/assign-donor`      | PATIENT, ADMIN        | Assign compatible donor to blood request                |
| **Donor Match**   | `POST`   | `/api/v1/blood-requests/:id/respond`      | DONOR                 | Donor ACCEPT / DECLINE match request                    |
| **Donor Match**   | `PATCH`  | `/api/v1/blood-requests/:id/status`       | PATIENT, ADMIN        | Advance request status in state machine workflow        |
| **Donor Match**   | `GET`    | `/api/v1/donor-matches/my-donations`      | DONOR                 | Get donor's completed donation history                  |
| **Payment**       | `POST`   | `/api/v1/payments/initiate`               | PATIENT, ADMIN        | Initiate bKash Tokenized payment                        |
| **Payment**       | `POST`   | `/api/v1/payments/execute`                | PATIENT, ADMIN        | Execute bKash payment, generate PDF & email invoice     |
| **Payment**       | `POST`   | `/api/v1/payments/refund/:requestId`      | ADMIN                 | Refund emergency logistics payment                      |
| **Payment**       | `GET`    | `/api/v1/payments/mine`                   | PATIENT, ADMIN        | List user's payment transaction history                 |
| **Payment**       | `GET`    | `/api/v1/payments/:id`                    | PATIENT, ADMIN        | Get detailed payment record                             |
| **Admin**         | `GET`    | `/api/v1/admin/users`                     | ADMIN                 | List and search all platform users                      |
| **Admin**         | `PATCH`  | `/api/v1/admin/users/:id/role`            | ADMIN                 | Promote user role or block/unblock user                 |
| **Admin**         | `GET`    | `/api/v1/admin/dashboard-stats`           | ADMIN                 | Fetch platform aggregate stats & revenue analytics      |
| **Admin**         | `GET`    | `/api/v1/admin/audit-logs`                | ADMIN                 | Search system audit logs and action trails              |

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
9. [Common System Enums](#common-system-enums)

---

## 1. Global API Conventions & Envelopes

### 1.1 Success Response Structure

All successful API responses adhere to a consistent JSON wrapper envelope:

```json
{
  "success": true,
  "statusCode": 200,
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

_Note: `meta` is present on all paginated list endpoints._

### 1.2 Error Response Structure

Error responses return standard HTTP status codes along with a structured payload:

```json
{
  "success": false,
  "message": "Validation Error / Internal Server Error / Unauthorized",
  "errorSources": [
    {
      "path": "email",
      "message": "Invalid email address format"
    }
  ],
  "stack": "Error stack trace (only in development environment)"
}
```

---

## 2. Authentication & Authorization Model

- **Bearer Token Auth Header**:
  ```http
  Authorization: Bearer <accessToken>
  ```
- **Cookie Auth (Fallback / Browser)**:
  `accessToken` and `refreshToken` are set as `httpOnly`, `sameSite: "none"` (or `lax` in dev), `secure` cookies upon successful login or token refresh.
- **Role-Based Access Control (RBAC)**:
  - `PATIENT`: Can create blood requests, assign donors, update status, and make bKash payments.
  - `DONOR`: Can view eligible requests, respond (`ACCEPT`/`DECLINE`) to match assignments, and check donation history.
  - `ADMIN`: Has complete system visibility, user role modification, user blocking, audit log retrieval, refund execution, and dashboard analytics access.

---

## Module 1: Authentication (`/auth`)

Rate limited by `authPaymentRateLimiter` (**10 requests per 15 minutes per IP**).

### 1.1 Register User

- **Endpoint**: `POST /auth/register`
- **Auth**: Public
- **Rate Limit**: 10 req / 15 min / IP
- **Description**: Registers a new donor or patient account and sends a 6-digit verification OTP to the user's email via Nodemailer.

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

- `name`: string, required.
- `email`: valid email string, required.
- `password`: minimum 6 characters, must contain at least one uppercase letter, one lowercase letter, one number, and one special character.
- `role`: optional, enum (`DONOR` | `PATIENT`), default `DONOR`.
- `bloodGroup`: enum (`A_POSITIVE`, `A_NEGATIVE`, `B_POSITIVE`, `B_NEGATIVE`, `AB_POSITIVE`, `AB_NEGATIVE`, `O_POSITIVE`, `O_NEGATIVE`), required.

#### Success Response (`201 Created`)

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Verification OTP Sent to email",
  "data": null
}
```

---

### 1.2 Verify Email OTP

- **Endpoint**: `POST /auth/verify-email`
- **Auth**: Public
- **Rate Limit**: 10 req / 15 min / IP
- **Description**: Validates the 6-digit OTP stored in Redis and activates the user account, setting JWT cookies.

#### Request Body

```json
{
  "email": "rahim@example.com",
  "otp": "482910"
}
```

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Email Verified Successfully",
  "data": {
    "user": {
      "id": "usr_clx10928374",
      "name": "Rahim Uddin",
      "email": "rahim@example.com",
      "role": "DONOR",
      "bloodGroup": "O_POSITIVE",
      "isVerified": true,
      "isAvailable": true
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
- **Rate Limit**: 10 req / 15 min / IP
- **Description**: Resends a new 6-digit registration verification OTP to the user email.

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
  "statusCode": 200,
  "message": "OTP resent successfully",
  "data": null
}
```

---

### 1.4 User Login

- **Endpoint**: `POST /auth/login`
- **Auth**: Public
- **Rate Limit**: 10 req / 15 min / IP
- **Description**: Authenticates user credentials and returns JWT tokens + sets cookies.

#### Request Body

```json
{
  "email": "rahim@example.com",
  "password": "Password@123"
}
```

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User Logged In Successfully",
  "data": {
    "user": {
      "id": "usr_clx10928374",
      "name": "Rahim Uddin",
      "email": "rahim@example.com",
      "role": "DONOR",
      "bloodGroup": "O_POSITIVE"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsIn..."
  }
}
```

---

### 1.5 Refresh Access Token

- **Endpoint**: `POST /auth/refresh-token`
- **Auth**: Public (Cookie `refreshToken` or body token)
- **Rate Limit**: 10 req / 15 min / IP
- **Description**: Rotates access token using a valid refresh token.

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Access token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsIn..."
  }
}
```

---

### 1.6 Google OAuth Login

- **Endpoint**: `POST /auth/google-login`
- **Auth**: Public
- **Rate Limit**: 10 req / 15 min / IP
- **Description**: Authenticates via Google OAuth ID Token.

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
  "statusCode": 200,
  "message": "Google Login Successful",
  "data": {
    "user": {
      "id": "usr_google_9281",
      "name": "Jane Doe",
      "email": "jane@gmail.com",
      "role": "PATIENT"
    },
    "accessToken": "eyJhbGciOiJIUzI1...",
    "refreshToken": "eyJhbGciOiJIUzI1..."
  }
}
```

---

### 1.7 Forgot Password

- **Endpoint**: `POST /auth/forgot-password`
- **Auth**: Public
- **Rate Limit**: 10 req / 15 min / IP
- **Description**: Sends password reset OTP to email.

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
  "statusCode": 200,
  "message": "Password reset OTP sent to email",
  "data": null
}
```

---

### 1.8 Reset Password

- **Endpoint**: `POST /auth/reset-password`
- **Auth**: Public
- **Rate Limit**: 10 req / 15 min / IP
- **Description**: Resets password using email and valid OTP.

#### Request Body

```json
{
  "email": "rahim@example.com",
  "otp": "859201",
  "newPassword": "NewPassword@123"
}
```

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Password reset successfully",
  "data": null
}
```

---

### 1.9 Logout User

- **Endpoint**: `POST /auth/logout`
- **Auth**: Authenticated
- **Description**: Clears `accessToken` and `refreshToken` httpOnly cookies.

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Logged out successfully",
  "data": null
}
```

---

## Module 2: User & Profile Management (`/users`)

### 2.1 Get Current User Profile

- **Endpoint**: `GET /users/me`
- **Auth**: Authenticated (`DONOR`, `PATIENT`, `ADMIN`)
- **Description**: Retrieves current logged-in user details.

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User profile fetched successfully",
  "data": {
    "id": "usr_clx10928374",
    "name": "Rahim Uddin",
    "email": "rahim@example.com",
    "role": "DONOR",
    "bloodGroup": "O_POSITIVE",
    "phone": "+8801700000000",
    "district": "Dhaka",
    "city": "Dhaka",
    "address": "Mirpur-10",
    "isAvailable": true,
    "lastDonatedAt": "2026-05-10T00:00:00.000Z",
    "avatar": "https://res.cloudinary.com/demo/image/upload/v12345/avatar.jpg"
  }
}
```

---

### 2.2 Update Profile

- **Endpoint**: `PATCH /users/me`
- **Auth**: Authenticated (`DONOR`, `PATIENT`, `ADMIN`)
- **Description**: Updates user profile details or availability status.

#### Request Body

```json
{
  "name": "Rahim Uddin",
  "phone": "+8801799999999",
  "district": "Gazipur",
  "city": "Gazipur Sadar",
  "address": "Chowrasta",
  "isAvailable": false
}
```

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Profile updated successfully",
  "data": {
    "id": "usr_clx10928374",
    "name": "Rahim Uddin",
    "phone": "+8801799999999",
    "district": "Gazipur",
    "isAvailable": false
  }
}
```

---

### 2.3 Upload Avatar

- **Endpoint**: `PATCH /users/me/avatar`
- **Auth**: Authenticated (`DONOR`, `PATIENT`, `ADMIN`)
- **Content-Type**: `multipart/form-data`
- **Form Field**: `avatar` (File)
- **Description**: Uploads profile picture to Cloudinary and updates user avatar URL.

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Avatar uploaded successfully",
  "data": {
    "avatar": "https://res.cloudinary.com/demo/image/upload/v98765/hemacue/avatars/user123.jpg"
  }
}
```

---

## Module 3: Blood Requests (`/blood-requests`)

### 3.1 Create Blood Request

- **Endpoint**: `POST /blood-requests`
- **Auth**: Authenticated (`PATIENT`, `ADMIN`)
- **Description**: Creates a new emergency or standard blood donation request.

#### Request Body

```json
{
  "patientName": "Karin Chowdhury",
  "bloodGroup": "AB_POSITIVE",
  "quantity": 2,
  "hospitalName": "Square Hospital",
  "hospitalAddress": "Panthapath, Dhaka",
  "district": "Dhaka",
  "neededBy": "2026-10-10T14:00:00.000Z",
  "contactPhone": "+8801811112222",
  "reason": "Elective surgery",
  "isUrgent": true
}
```

#### Success Response (`201 Created`)

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Blood request created successfully",
  "data": {
    "id": "req_9920182",
    "requesterId": "usr_clx10928374",
    "patientName": "Karin Chowdhury",
    "bloodGroup": "AB_POSITIVE",
    "quantity": 2,
    "hospitalName": "Square Hospital",
    "status": "PENDING",
    "isUrgent": true,
    "createdAt": "2026-10-05T16:00:00.000Z"
  }
}
```

---

### 3.2 Get All Blood Requests (Public Feed & Search)

- **Endpoint**: `GET /blood-requests`
- **Auth**: Public
- **Query Parameters**:
  - `page` (number, default: 1)
  - `limit` (number, default: 10)
  - `bloodGroup` (enum filter)
  - `district` (string filter)
  - `urgency` / `isUrgent` (boolean string)
  - `status` (enum filter: `PENDING`, `VERIFIED`, `DONOR_ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`)
  - `searchTerm` (search patient name, hospital, district)

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "statusCode": 200,
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
      "id": "req_9920182",
      "patientName": "Karin Chowdhury",
      "bloodGroup": "AB_POSITIVE",
      "quantity": 2,
      "hospitalName": "Square Hospital",
      "district": "Dhaka",
      "neededBy": "2026-10-10T14:00:00.000Z",
      "status": "PENDING",
      "isUrgent": true
    }
  ]
}
```

---

### 3.3 Get My Blood Requests

- **Endpoint**: `GET /blood-requests/my-requests`
- **Auth**: Authenticated (`PATIENT`, `ADMIN`)
- **Description**: Returns all blood requests posted by the authenticated user.

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "statusCode": 200,
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
- **Description**: Retrieves detailed information for a single blood request.

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Blood request retrieved successfully",
  "data": {
    "id": "req_9920182",
    "patientName": "Karin Chowdhury",
    "bloodGroup": "AB_POSITIVE",
    "hospitalName": "Square Hospital",
    "requester": {
      "id": "usr_clx10928374",
      "name": "Rahim Uddin",
      "email": "rahim@example.com"
    }
  }
}
```

---

### 3.5 Update Blood Request

- **Endpoint**: `PATCH /blood-requests/:id`
- **Auth**: Authenticated (`PATIENT`, `ADMIN`)
- **Description**: Updates blood request details (allowed for request creator or Admin).

#### Request Body

```json
{
  "quantity": 3,
  "reason": "Emergency surgery shifted to earlier time",
  "isUrgent": true
}
```

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Blood request updated successfully",
  "data": { "id": "req_9920182", "quantity": 3 }
}
```

---

### 3.6 Soft Delete Blood Request

- **Endpoint**: `DELETE /blood-requests/:id`
- **Auth**: Authenticated (`PATIENT`, `ADMIN`)
- **Description**: Soft deletes a blood request.

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Blood request deleted successfully",
  "data": null
}
```

---

## Module 4: Smart Donor Matching & Request Workflow (`/donor-matches` & `/blood-requests`)

### 4.1 Find Compatible Donors

- **Endpoint**: `GET /donor-matches/compatible-donors`
- **Auth**: Authenticated (`PATIENT`, `ADMIN`)
- **Query Parameters**:
  - `bloodGroup` (required, target recipient blood group)
  - `district` (optional district filter)
  - `requestId` (optional, excludes donors already assigned to this request)
- **Business Rules**: Enforces medical blood compatibility matrix & 90-day donation cooldown.

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Compatible donors retrieved successfully",
  "data": [
    {
      "id": "usr_donor_881",
      "name": "Dr. Hasan",
      "bloodGroup": "O_NEGATIVE",
      "district": "Dhaka",
      "isAvailable": true,
      "lastDonatedAt": "2025-12-01T00:00:00.000Z"
    }
  ]
}
```

---

### 4.2 Assign Donor to Request

- **Endpoint**: `POST /donor-matches/assign-donor`
- **Auth**: Authenticated (`PATIENT`, `ADMIN`)
- **Description**: Assigns a compatible donor to a specific blood request.

#### Request Body

```json
{
  "requestId": "req_9920182",
  "donorId": "usr_donor_881"
}
```

#### Success Response (`201 Created`)

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Donor assigned successfully",
  "data": {
    "id": "match_551029",
    "requestId": "req_9920182",
    "donorId": "usr_donor_881",
    "status": "PENDING"
  }
}
```

---

### 4.3 Respond to Match Request (Donor Action)

- **Endpoint**: `POST /blood-requests/:id/respond`
- **Auth**: Authenticated (`DONOR`)
- **Description**: Allows assigned donor to ACCEPT or DECLINE a match request.

#### Request Body

```json
{
  "status": "ACCEPTED"
}
```

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Response recorded successfully",
  "data": null
}
```

---

### 4.4 Update Request Workflow Status

- **Endpoint**: `PATCH /blood-requests/:id/status`
- **Auth**: Authenticated (`PATIENT`, `ADMIN`)
- **Description**: Advances the blood request through the guarded state machine:
  $$\text{PENDING} \rightarrow \text{VERIFIED} \rightarrow \text{DONOR\_ASSIGNED} \rightarrow \text{IN\_PROGRESS} \rightarrow \text{COMPLETED}$$

#### Request Body

```json
{
  "status": "COMPLETED"
}
```

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Blood request status updated to COMPLETED successfully",
  "data": {
    "id": "req_9920182",
    "status": "COMPLETED"
  }
}
```

---

### 4.5 Get My Donation History

- **Endpoint**: `GET /donor-matches/my-donations`
- **Auth**: Authenticated (`DONOR`)
- **Description**: Retrieves history of blood donations completed by the donor.

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Donation history retrieved successfully",
  "data": [
    {
      "id": "match_551029",
      "bloodRequest": {
        "id": "req_9920182",
        "patientName": "Karin Chowdhury",
        "hospitalName": "Square Hospital"
      },
      "status": "ACCEPTED",
      "createdAt": "2026-10-05T16:05:00.000Z"
    }
  ]
}
```

---

## Module 5: bKash Tokenized Payments (`/payments`)

Rate limited by `authPaymentRateLimiter` (**10 requests per 15 minutes per IP**).

### 5.1 Initiate Payment

- **Endpoint**: `POST /payments/initiate`
- **Auth**: Authenticated (`PATIENT`, `ADMIN`)
- **Rate Limit**: 10 req / 15 min / IP
- **Description**: Calls bKash Tokenized Checkout API to create a payment request.

#### Request Body

```json
{
  "requestId": "req_9920182",
  "amount": 500,
  "addOnType": "PREMIUM_NOTIFICATION"
}
```

#### Success Response (`201 Created`)

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Payment initiated successfully",
  "data": {
    "paymentID": "TR00118291039",
    "bkashURL": "https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/bKash/create?paymentID=TR00118291039",
    "callbackURL": "http://localhost:3000/payment/callback",
    "amount": "500",
    "currency": "BDT"
  }
}
```

---

### 5.2 Execute Payment

- **Endpoint**: `POST /payments/execute`
- **Auth**: Authenticated (`PATIENT`, `ADMIN`)
- **Rate Limit**: 10 req / 15 min / IP
- **Description**: Finalizes bKash tokenized payment, generates a PDF invoice, and sends an email invoice.

#### Request Body

```json
{
  "paymentID": "TR00118291039"
}
```

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Payment executed successfully",
  "data": {
    "id": "pay_9018231",
    "paymentID": "TR00118291039",
    "trxID": "7A8901BC99",
    "amount": 500,
    "status": "COMPLETED",
    "invoiceUrl": null
  }
}
```

---

### 5.3 Refund Emergency Logistics Payment

- **Endpoint**: `POST /payments/refund/:requestId`
- **Auth**: Authenticated (`ADMIN`)
- **Description**: Executes a bKash refund for emergency logistics payments and records an audit log.

#### Request Body

```json
{
  "reason": "Unfulfilled logistics courier availability"
}
```

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Payment refunded successfully",
  "data": {
    "refundTrxID": "RF88102931",
    "status": "REFUNDED"
  }
}
```

---

### 5.4 Get My Payments

- **Endpoint**: `GET /payments/mine`
- **Auth**: Authenticated (`PATIENT`, `ADMIN`)
- **Query Parameters**: `page`, `limit`, `sortOrder` (`asc` | `desc`)
- **Description**: Returns payment history for the logged in user.

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Payments retrieved successfully",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "totalPages": 1,
    "totalPage": 1
  },
  "data": []
}
```

---

### 5.5 Get Payment Details By ID

- **Endpoint**: `GET /payments/:id`
- **Auth**: Authenticated (`PATIENT`, `ADMIN`)
- **Description**: Fetches detailed payment record.

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Payment details retrieved successfully",
  "data": {
    "id": "pay_9018231",
    "paymentID": "TR00118291039",
    "trxID": "7A8901BC99",
    "amount": 500,
    "addOnType": "PREMIUM_NOTIFICATION",
    "status": "COMPLETED"
  }
}
```

---

## Module 6: Admin Administration & Audit Analytics (`/admin`)

### 6.1 Get All Users (Admin User Management)

- **Endpoint**: `GET /admin/users`
- **Auth**: Authenticated (`ADMIN`)
- **Query Parameters**: `page`, `limit`, `role`, `bloodGroup`, `isBlocked`, `searchTerm`

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Users retrieved successfully",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 120,
    "totalPages": 12,
    "totalPage": 12
  },
  "data": []
}
```

---

### 6.2 Update User Role or Block Status

- **Endpoint**: `PATCH /admin/users/:id/role`
- **Auth**: Authenticated (`ADMIN`)
- **Description**: Promotes user role (`DONOR`, `PATIENT`, `ADMIN`) or blocks/unblocks user.

#### Request Body

```json
{
  "role": "ADMIN",
  "isBlocked": false
}
```

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User updated successfully",
  "data": {
    "id": "usr_clx10928374",
    "role": "ADMIN",
    "isBlocked": false
  }
}
```

---

### 6.3 Get Admin Analytics Dashboard Stats

- **Endpoint**: `GET /admin/dashboard-stats`
- **Auth**: Authenticated (`ADMIN`)
- **Description**: Computes system-wide aggregate stats concurrently.

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Dashboard statistics retrieved successfully",
  "data": {
    "users": {
      "total": 125,
      "donors": 90,
      "patients": 30,
      "admins": 5
    },
    "bloodRequests": {
      "total": 45,
      "pending": 10,
      "verified": 15,
      "inProgress": 10,
      "completed": 8,
      "cancelled": 2
    },
    "donations": {
      "completedDonations": 8
    },
    "revenue": {
      "totalRevenueBDT": 4500,
      "successfulPayments": 9
    }
  }
}
```

---

### 6.4 Get System Audit Logs

- **Endpoint**: `GET /admin/audit-logs`
- **Auth**: Authenticated (`ADMIN`)
- **Query Parameters**: `page`, `limit`, `action`, `performedById`

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "statusCode": 200,
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
      "id": "log_001928",
      "performedById": "usr_admin_01",
      "action": "USER_ROLE_UPDATED",
      "targetEntity": "User",
      "targetId": "usr_clx10928374",
      "createdAt": "2026-10-05T16:10:00.000Z"
    }
  ]
}
```

---

## Common System Enums

### UserRole

`DONOR`, `PATIENT`, `ADMIN`

### BloodGroup

`A_POSITIVE`, `A_NEGATIVE`, `B_POSITIVE`, `B_NEGATIVE`, `AB_POSITIVE`, `AB_NEGATIVE`, `O_POSITIVE`, `O_NEGATIVE`

### RequestStatus

`PENDING`, `VERIFIED`, `DONOR_ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`

### DonorMatchStatus

`PENDING`, `ACCEPTED`, `DECLINED`, `CANCELLED`

### PaymentStatus

`PENDING`, `COMPLETED`, `FAILED`, `REFUNDED`

### AddOnType

`PREMIUM_NOTIFICATION`, `EMERGENCY_LOGISTICS`
