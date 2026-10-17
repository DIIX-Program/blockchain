# Backend API & Role-Based Access Control (RBAC) Guide

This document details the backend REST API architecture, authentication flow, server-side RBAC permissions matrix, validation rules, error handling, and OpenAPI documentation implemented for the **Smart Cold-Chain Traceability System**.

---

## 1. Authentication Architecture

### 1.1 JWT Bearer Token Flow
- Users authenticate by sending credentials to `POST /api/v1/auth/login`.
- Upon successful authentication, the server generates a cryptographically signed JSON Web Token (JWT) containing:
  ```json
  {
    "userId": "uuid",
    "email": "producer@vaxlab.com",
    "role": "PRODUCER",
    "organizationId": "uuid",
    "iat": 1729170000,
    "exp": 1729256400
  }
  ```
- Clients must include this token in the `Authorization` header for protected endpoints:
  ```http
  Authorization: Bearer <jwt_access_token>
  ```
- Plaintext passwords are never stored; passwords are salted and hashed using `bcryptjs` with 10 rounds.

---

## 2. Server-Side RBAC Permissions Matrix

The system enforces 5 distinct roles at the controller/route level:

| Endpoint Module | HTTP Method & Path | ADMIN | PRODUCER | TRANSPORTER | WAREHOUSE_OPERATOR | VIEWER | PUBLIC (No Auth) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Auth** | `POST /auth/login` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Auth** | `GET /auth/me` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Auth** | `POST /auth/register` | ✅ | ❌ | ❌ | ❌ | ✅*(Self)* | ❌ |
| **Organizations** | `GET /organizations` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Organizations** | `POST /organizations` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Users** | `GET /users` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Products** | `GET /products` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Products** | `POST /products` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Batches (Public)**| `GET /batches/public/:batchNumber` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Batches** | `GET /batches` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Batches** | `POST /batches` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Batches** | `PATCH /batches/:id/status`| ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Events** | `POST /events` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Devices** | `GET /devices` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Devices** | `POST /devices` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Sensors** | `POST /sensors/telemetry` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅*(IoT/Simulator)* |
| **Sensors** | `GET /sensors/batch/:batchId` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Alerts** | `GET /alerts` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Alerts** | `PATCH /alerts/:id/acknowledge` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Alerts** | `PATCH /alerts/:id/resolve` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Anchors** | `POST /anchors` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Anchors** | `GET /anchors/verify/:batchId` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 3. Engineering Quality & Standards

### 3.1 Input Validation (Zod)
Every mutating endpoint validates request bodies using Zod schemas. Invalid payloads return structured HTTP 400 responses:
```json
{
  "error": "ValidationError",
  "message": "Invalid request input",
  "details": [
    { "field": "tempMinC", "message": "tempMinC must be strictly less than tempMaxC" }
  ]
}
```

### 3.2 Idempotency in Telemetry Ingestion
- Ingestion endpoint: `POST /api/v1/sensors/telemetry`
- Guaranteed by unique constraint `[deviceId, sequenceNumber, recordedAt]`.
- First submission: `HTTP 201 Created` (`status: "INGESTED"`).
- Duplicate submission: `HTTP 200 OK` (`status: "DUPLICATE_IGNORED"`).

### 3.3 Transactional Consistency
Supply chain events (such as `CUSTODY_HANDOVER`, `WAREHOUSE_RECEIVE`, `FINAL_DELIVERY`) use `prisma.$transaction`:
- The event record is created in `SupplyChainEvent`.
- The target batch's `currentHolderId` and `status` are atomically updated.
- If either write fails, the entire transaction rolls back.

### 3.4 OpenAPI 3.0 Documentation & Swagger UI
- Interactive Swagger UI: `http://localhost:4000/api/v1/docs`
- Raw OpenAPI JSON: `http://localhost:4000/api/v1/docs/openapi.json`

---

## 4. Automated Test Suite Execution

Run the backend integration test suite:
```bash
npm --prefix apps/api run test
```
The test suite executes 27 comprehensive tests in ~1.5s:
- Authentication & JWT token verification (401 on bad password, expired token, missing token).
- RBAC authorization checks (403 when VIEWER accesses `/users`, 403 when TRANSPORTER creates products).
- Zod schema validation (400 on inverted temp limits, malformed JSON).
- Public traceability portal verification (200 on valid batch without auth).
- Telemetry ingestion & idempotency deduplication.
- Transactional custody handover events.
- OpenAPI specification & Swagger UI serving.
