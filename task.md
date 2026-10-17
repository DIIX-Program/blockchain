# TASK 00 — REPOSITORY AUDIT & IMPLEMENTATION PLAN

Read the Master Prompt first.

Your job is to inspect the current repository and create a realistic implementation plan. Do not implement the application yet.

## Actions
1. Inspect the folder structure, package manifests, source files, existing documentation, Git status, environment examples, and available test commands.
2. Identify existing code that can be reused and potential conflicts.
3. Define system boundaries and the responsibilities of the frontend, backend, AI service, PostgreSQL, blockchain, and IoT simulator.
4. Design the main entities and relationships: User, Organization, Product, Batch, SupplyChainEvent, Device, SensorReading, AnomalyAlert, DataAnchor, and AuditLog.
5. Define API conventions, authentication rules, error formats, timestamp conventions, hash canonicalization, and idempotency.
6. Define the development order and dependencies between tasks.
7. Identify the minimum viable product (MVP) and optional extensions.
8. Produce an architecture diagram using Mermaid and a proposed repository tree.
9. List risks and how to mitigate them.

## Deliverables
- `docs/PROJECT_PLAN.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/IMPLEMENTATION_ROADMAP.md`

Adapt filenames if equivalent documentation already exists.

## Acceptance criteria
- The plan matches the actual repository.
- Every major module has defined responsibilities and interfaces.
- The MVP is achievable without physical IoT hardware.
- AI, database, and blockchain integration contracts are documented.
- No application implementation is performed in this task.

Finish by reporting the recommended next task.



# TASK 01 — PROJECT SCAFFOLDING

Read the Master Prompt and the approved documents from Task 00.

Implement the project skeleton only.

## Requirements
- Use a monorepo structure appropriate for the existing repository.
- Suggested folders: `apps/web`, `apps/api`, `services/ai`, `contracts`, `infra`, and `docs`.
- Configure TypeScript consistently.
- Add formatting and linting configuration where appropriate.
- Add `.gitignore` and `.env.example` files.
- Add basic health endpoints for the backend and AI service.
- Add a PostgreSQL development configuration and Docker Compose if appropriate.
- Add centralized configuration loading and validation.
- Add a root README with exact installation and startup instructions.
- Pin compatible dependency versions in lockfiles.
- Never put real credentials in tracked files.

Do not implement business logic yet.

## Acceptance criteria
- The documented commands install dependencies successfully.
- The frontend starts.
- The backend health endpoint works.
- The AI service health endpoint works.
- PostgreSQL starts using the documented method.
- No secrets are committed.
- Existing working project functionality is preserved.


# TASK 02 — DATABASE AND MIGRATIONS

Read the approved data model and inspect the current database configuration.

Implement the PostgreSQL schema using Prisma unless the repository already uses a suitable ORM.

## Core entities
- User
- Organization
- Product
- Batch
- SupplyChainEvent
- Device
- SensorReading
- AnomalyAlert
- DataAnchor
- AuditLog

Add other entities only when justified by the requirements.

## Requirements
- Define primary keys, foreign keys, unique constraints, indexes, enums, and deletion behavior.
- A batch must have a stable traceability identifier.
- Sensor readings must reference their batch and device where applicable.
- Support event timestamps, recorded timestamps, sensor values, and sequence numbers.
- Store anchoring status, hash algorithm, hash value, transaction hash, and confirmation state.
- Use UTC timestamps consistently.
- Prevent duplicate ingestion using a documented idempotency design.
- Avoid storing derived or duplicate data unnecessarily.
- Add seed data for development and demonstration.

## Deliverables
- Prisma schema and migrations.
- Seed script.
- Database relationship diagram.
- Documentation for migrations and reset procedures.

## Acceptance criteria
- A clean database can be migrated from scratch.
- Seed data loads successfully.
- Foreign-key and unique constraints work.
- Core database operations have automated tests where appropriate.
- No real user passwords or secrets appear in seed data.


# TASK 03 — BACKEND FOUNDATION AND RBAC

Implement the backend REST API using the project's approved architecture.

## Requirements

### Authentication
- User registration only where appropriate to the project's role model.
- Login and logout/session strategy.
- Secure password hashing.
- JWT access tokens with appropriate expiration.
- Validate authentication on protected routes.
- Do not store plaintext passwords.
- Do not put secrets in frontend environment variables.

### Authorization
Implement server-side RBAC for ADMIN, PRODUCER, TRANSPORTER, WAREHOUSE_OPERATOR, and VIEWER.
Define which roles can create batches, record handovers, register devices, inspect alerts, and anchor hashes.
Restrict public users to explicitly public traceability endpoints.

### API modules
- Authentication and current user.
- Users and organizations.
- Products.
- Batches.
- Supply-chain events and handovers.
- Devices.
- Sensor readings.
- Alerts.
- Anchors and verification.

Implement only the business operations appropriate to each current stage; future modules may initially have clearly documented interfaces rather than fake functionality.

### Engineering quality
- Validate requests using a consistent schema-validation library.
- Add centralized error handling.
- Use correct HTTP status codes.
- Add pagination and filtering for list endpoints.
- Use transactions where multiple database writes must succeed together.
- Generate OpenAPI documentation.
- Add unit and integration tests.

## Acceptance criteria
- Login and protected endpoints work.
- Unauthorized roles are rejected by the backend.
- Invalid input returns structured errors.
- API documentation reflects actual routes.
- Tests cover authentication, authorization, and core CRUD operations.


# TASK 04 — IOT SIMULATOR AND SENSOR INGESTION

Implement a realistic IoT data pipeline without requiring physical hardware.

## Simulator
Create a configurable simulator that produces sensor readings for assigned devices and batches.

Each reading should include:
- `batchId`
- `deviceId`
- `sequenceNumber`
- `recordedAt`
- `temperatureC`
- `humidityPercent`
- Optional latitude and longitude
- Optional battery or signal status

Support scenarios:
1. Normal cold-chain operation.
2. Temperature above the permitted range.
3. Sudden temperature spike.
4. Delayed shipment or prolonged stationary period.
5. Missing readings.
6. Implausible or suspicious location changes.

Make product-specific temperature limits configurable. Do not assume every product uses the same acceptable range.

## Ingestion API
- Validate device identity and payloads.
- Validate timestamps and numeric ranges.
- Handle duplicate submissions idempotently.
- Store readings in PostgreSQL.
- Preserve the original submitted values needed for integrity checks.
- Record ingestion errors without exposing secrets.
- Support batch-specific reading queries with pagination.

## Important
Clearly label simulated readings in the data model or metadata. Do not represent simulator output as real hardware telemetry.

## Acceptance criteria
- The simulator generates reproducible scenarios.
- Readings appear in the database and API.
- Duplicate submissions do not create duplicate records.
- Invalid payloads are rejected.
- Automated tests cover normal and abnormal ingestion.
- Document how a future ESP32 device can use the same API.


# TASK 05 — WEB DASHBOARD AND TRACEABILITY UI

Implement the React + TypeScript frontend using the actual backend API.

## UI direction
Build a polished, professional cold-chain monitoring dashboard suitable for a university project presentation. Use a coherent design system, responsive layouts, clear typography, meaningful status colors, and consistent spacing. Avoid excessive glass effects, unnecessary gradients, and decorative components that reduce readability.

## Required pages
1. Login.
2. Overview dashboard.
3. Product list and product details.
4. Batch list and batch detail.
5. Sensor monitoring with time-series charts.
6. Supply-chain timeline and handovers.
7. AI anomaly alerts.
8. Blockchain anchors and integrity verification.
9. User/device management for authorized roles.
10. Public traceability page.

## Functional requirements
- Fetch real data from the API.
- Show loading, empty, success, and error states.
- Support pagination and filters where needed.
- Display temperature units and timestamp timezone.
- Distinguish simulated telemetry from real-device telemetry.
- Show anomaly explanations, not only red warning icons.
- Show blockchain confirmation status honestly.
- Enforce frontend route guards while relying on backend authorization for actual security.
- Do not hardcode mock values into production dashboard components.
- Use a chart library only after checking compatibility with the installed frontend stack.
- Ensure basic keyboard accessibility and responsive mobile layouts.

## Acceptance criteria
- Main workflows function against the backend.
- Refreshing a page does not lose persisted data.
- Charts use API data.
- API errors are handled gracefully.
- Layout works on desktop and mobile.
- No fake success states are shown for incomplete backend operations.


# TASK 06 — AI ANOMALY DETECTION SERVICE

Build the Python FastAPI anomaly detection service.

## Phase A: transparent baseline
Implement configurable threshold rules for:
- Temperature excursion.
- Humidity excursion where applicable.
- Prolonged delivery duration.
- Missing or delayed sensor readings.
- Implausible location changes where location data is available.

Clearly distinguish a rule violation from an ML anomaly prediction.

## Phase B: Isolation Forest
- Define the feature set and units.
- Validate incoming features.
- Handle missing values consistently.
- Train a reproducible Isolation Forest baseline.
- Persist the trained model and preprocessing configuration.
- Provide prediction and batch-analysis endpoints.
- Return anomaly status, score, model version, and available explanation metadata.
- Do not call the anomaly score a probability unless it has been calibrated.
- Handle insufficient training data safely.

## Evaluation
Create labeled synthetic datasets for normal and abnormal cases. Split data to reduce leakage, document assumptions, and report precision, recall, F1-score, false-positive rate, and confusion matrix when supported by the test setup.

Do not fabricate results. If synthetic labels are used, explicitly state that the metrics are only evidence of performance on synthetic test data.

## Deliverables
- Training script.
- Inference service.
- Dataset-generation script.
- Model versioning approach.
- Automated tests.
- `docs/AI_PIPELINE.md`.

## Acceptance criteria
- The service starts and responds to health checks.
- Known rule violations are detected.
- The ML model can be trained and loaded reproducibly.
- Invalid input returns useful errors.
- Evaluation results can be reproduced from documented commands.


# TASK 07 — AI INTEGRATION AND ALERT WORKFLOW

Integrate the AI service with the Node.js backend and frontend.

## Requirements
1. Define a typed internal client for the AI service.
2. Send eligible sensor windows or batches for analysis.
3. Avoid blocking sensor ingestion unnecessarily if asynchronous processing is more appropriate.
4. Persist anomaly results and alert status.
5. Link each alert to the affected batch, device, time window, and supporting readings.
6. Include detection method: RULE_BASED or ML_MODEL.
7. Store model/version information and a clear explanation of the result.
8. Support alert acknowledgement and resolution by authorized roles.
9. Prevent repeated identical readings from generating uncontrolled duplicate alerts.
10. Display alert severity, status, time, and evidence in the dashboard.

## Failure handling
- If the AI service is unavailable, preserve valid sensor ingestion where possible.
- Record analysis failures for retry or diagnosis.
- Do not silently classify a failed analysis as normal.
- Apply timeouts and bounded retries.
- Avoid retry loops that generate duplicate records.

## Acceptance criteria
- Simulator readings trigger the appropriate analysis workflow.
- Alerts persist in PostgreSQL.
- Dashboard alerts reflect persisted data.
- Service failure is distinguishable from a normal prediction.
- Integration tests cover successful analysis, anomalies, and AI-service failure.


# TASK 08 — SMART CONTRACT AND LOCAL BLOCKCHAIN

Implement the Solidity contract using the project's Hardhat setup.

## Contract purpose
Anchor hashes for batches or groups of sensor records and record important supply-chain events such as custody handovers.

## Requirements
- Use stable batch identifiers.
- Support anchoring a `bytes32` data hash.
- Store the relevant hash, event type, timestamp, and submitting account or authorized role.
- Emit events that the backend can index.
- Restrict anchoring to authorized accounts.
- Reject malformed, empty, or otherwise invalid inputs.
- Define duplicate-anchor behavior explicitly.
- Provide read functions for verification.
- Use appropriate access-control patterns.
- Include NatSpec documentation.
- Add automated contract tests for valid writes, unauthorized writes, invalid input, and verification behavior.

## Security and integrity
- Never put detailed sensor histories or personal information directly on-chain.
- Do not embed a real private key in source code.
- Use only development accounts and local chain configuration for this task.
- Do not claim that local deployment is production deployment.
- Keep the contract small and understandable.

## Deliverables
- Solidity contract.
- Hardhat configuration.
- Deployment script.
- Unit tests.
- Example `.env.example` values without real secrets.
- `docs/BLOCKCHAIN_DESIGN.md`.

## Acceptance criteria
- Contract compiles.
- Tests pass on the configured local network.
- Authorized accounts can anchor and retrieve hashes.
- Unauthorized accounts cannot perform protected operations.
- Deployment instructions are reproducible.


# TASK 09 — HASHING, ANCHORING AND INTEGRITY VERIFICATION

Implement the data-integrity layer connecting PostgreSQL, the backend, and the smart contract.

## Hashing
- Define a versioned canonical JSON representation for the records being committed.
- Normalize field ordering, timestamps, number formatting, null values, and encoding consistently.
- Calculate SHA-256 hashes using a well-defined byte representation.
- Include the schema or canonicalization version in the committed metadata.
- Add deterministic hashing tests: identical canonical data must produce identical hashes.
- Document how changes to the schema are handled.

## Anchoring workflow
1. Select an eligible reading or deterministic group of readings.
2. Canonicalize the selected records.
3. Compute the hash.
4. Submit the hash to the smart contract.
5. Record transaction hash and submission status.
6. Wait for transaction confirmation where required.
7. Persist the confirmed anchor metadata.
8. Expose a verification endpoint.

## Verification
- Recompute the hash from the records under the defined canonicalization rules.
- Compare the computed hash with the expected anchor.
- Distinguish MATCH, MISMATCH, PENDING, and UNAVAILABLE states.
- Never label an unconfirmed transaction as confirmed.
- Record verification attempts and useful audit information.
- Handle blockchain RPC errors without incorrectly reporting MATCH.

## Merkle tree
Treat Merkle batching as an optional extension. Implement it only after the simple per-record or per-batch hash workflow is correct and tested. Define leaf ordering and odd-node handling if implemented.

## Acceptance criteria
- A valid record verifies against its anchor.
- A modified anchored record produces MISMATCH.
- Pending or unreachable blockchain states are not reported as successful verification.
- Transaction metadata is persisted correctly.
- Hash and anchoring tests pass.


# TASK 10 — QR TRACEABILITY AND SUPPLY-CHAIN TIMELINE

Implement QR-based public traceability.

## Requirements
- Generate a stable public traceability URL for each eligible batch.
- Generate a QR code that resolves to that URL.
- Provide a public page containing approved product and batch information.
- Display supply-chain stages, handover timestamps, and shipment status.
- Display sensor summaries and relevant temperature excursions.
- Show AI alerts with appropriate public disclosure rules.
- Show the latest hash-verification result and anchoring status.
- Clearly distinguish verified integrity from claims about physical sensor truth.
- Never expose internal user data, credentials, private notes, or restricted organization information.
- Validate batch visibility and public access rules on the backend.
- Ensure QR codes remain valid when internal database IDs are not public identifiers.

## Acceptance criteria
- A user can scan or open the QR URL and view the correct batch.
- Unknown or private batches do not leak information.
- The page displays actual backend data.
- Verification status is current and not hardcoded.
- QR generation and access-control tests pass.


# TASK 11 — END-TO-END INTEGRATION AND QA

Audit and test the entire application against the Master Prompt.

## Test the following complete scenarios

### Scenario A: normal shipment
Create a batch, generate normal sensor readings, view dashboard charts, record a handover, anchor data, and verify integrity.

### Scenario B: temperature excursion
Generate readings above the batch's configured limit. Confirm that the baseline rules detect the violation and that the AI workflow stores its result. Verify the alert appears in the dashboard.

### Scenario C: modified sensor record
Anchor a record, modify the stored record in a controlled test, and verify that integrity checking reports MISMATCH.

### Scenario D: unauthorized access
Attempt protected operations using the wrong role and an unauthenticated request. Verify that access is denied.

### Scenario E: service outage
Make the AI service or local blockchain RPC unavailable. Confirm that errors are represented accurately and the application does not claim false success.

### Scenario F: QR traceability
Open the QR URL for a valid public batch and confirm that the timeline, sensor summary, and verification information are consistent.

## Actions
- Run all unit, integration, and contract tests.
- Fix root causes instead of suppressing failing tests.
- Verify database migrations from a clean state.
- Check frontend loading/error states.
- Inspect logs for secrets or sensitive data.
- Review authorization and input validation.
- Verify that the documented commands work.
- Report any test that could not be executed and why.

## Deliverables
- Automated test updates.
- `docs/TEST_PLAN.md`.
- A test-results report containing actual commands and results.
- A list of known limitations and residual risks.

Do not mark the project complete if core tests are failing.


# TASK 12 — FINAL DOCUMENTATION AND DEMONSTRATION

Prepare the project for a university presentation and technical review.

## Documentation
Create or update:
- `README.md`
- `docs/PROJECT_PLAN.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/API.md` or generated OpenAPI instructions
- `docs/AI_PIPELINE.md`
- `docs/BLOCKCHAIN_DESIGN.md`
- `docs/TEST_PLAN.md`
- `docs/DEPLOYMENT.md`
- `docs/DEMO_SCRIPT.md`
- `docs/LIMITATIONS_AND_FUTURE_WORK.md`

Adapt filenames to the existing repository rather than creating duplicate documentation.

## Required content
1. Problem statement and objectives.
2. Scope and system requirements.
3. Architecture and data flow.
4. Database model.
5. IoT simulator and optional hardware integration.
6. AI algorithm, features, dataset, evaluation method, and limitations.
7. Hashing and smart-contract workflow.
8. Security and authorization.
9. Test cases and actual test results.
10. Installation, configuration, startup, and troubleshooting.
11. Demonstration scenarios.
12. Limitations and future improvements.

## Demo script
Prepare a reproducible 5–10 minute demonstration:
1. Log in with a permitted role.
2. Open a traceability batch.
3. Generate normal sensor readings.
4. Trigger a temperature anomaly.
5. Show the stored alert and evidence.
6. Anchor data on the local blockchain.
7. Verify the anchor.
8. Demonstrate a controlled tampering test and show MISMATCH.
9. Open the public QR traceability page.

## Academic integrity
- Clearly distinguish implemented features from proposed extensions.
- Clearly identify simulated data.
- Report only metrics actually measured.
- Do not fabricate experiments, citations, hardware tests, or deployment results.
- Add a glossary of technical terms and prepare likely defense questions with technically accurate answers.

## Final acceptance
Provide a final status table for each requirement: IMPLEMENTED, PARTIAL, NOT IMPLEMENTED, or BLOCKED. Include evidence such as test names, commands, or file references. Do not claim the project is production-ready merely because it runs locally.


# OPTIONAL TASK — ESP32 SENSOR INTEGRATION

Extend the existing IoT ingestion workflow to support a physical ESP32 device without breaking the simulator.

## Requirements
- Inspect the existing backend ingestion API before writing firmware.
- Select compatible temperature/humidity sensors based on actual available hardware.
- Keep Wi-Fi credentials out of committed source files.
- Send device identity, sequence number, timestamp, and sensor readings using the existing API contract.
- Add request authentication or a device-specific credential mechanism.
- Handle connection failures, bounded retries, and duplicate delivery.
- Document sensor calibration limitations and timestamp synchronization.
- Keep a clear distinction between simulator and physical-device records.
- Provide firmware setup instructions, wiring diagram, and a tested payload example.
- Never claim a physical test was performed unless it was actually performed.

## Acceptance criteria
- ESP32 firmware compiles with the documented toolchain.
- Payload format matches the backend contract.
- Invalid or unauthenticated device submissions are rejected.
- Simulator functionality continues to work.
- Physical validation results are documented separately from simulated tests.
