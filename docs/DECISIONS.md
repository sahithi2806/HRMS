# Architecture & Engineering Decisions Log

This document records architectural, engineering, and design decisions made while extending the HRMS.

## Decisions

### v6 — Hardening of Existing App
- **JWT Key Storage & Rotation**: Removed hardcoded production-like JWT key from `appsettings.json` and `Program.cs`. Stored placeholder in config; runtime enforces minimum 32-character key from User Secrets or environment variable (`JWT_SECRET_KEY`) with immediate fatal startup termination if absent or placeholder. Rotated compromised committed secret.
- **Dedicated 409 Conflict Exception**: Created `ConflictException` mapped in `ExceptionMiddleware` to HTTP 409 Conflict to express concurrency failures, deactivation with active reports, and last-admin demotion per specification.
- **Pure Business Days Helper**: Implemented `BusinessDays.Calculate` counting Mon–Fri business days for leave requests, preventing weekend calendar days from consuming quota.
- **Shared Approval Policy**: Implemented `ApprovalPolicy` enforcing: approver must be direct manager; if no manager, Admin may act; self-approval strictly forbidden for all roles (including Admin); Admin read-only when manager exists.
- **Real-Time Token Invalidation**: Configured JWT `OnTokenValidated` hook querying `Employees.Status` on every authenticated request so deactivated employee tokens are rejected immediately with 401 without waiting for token expiry.
- **Leave Annual Allocation**: Configured `Leave:AnnualAllocation` defaulting to 24 to align with Admin/Manager seed data and specification.
- **Computed RemainingLeaves**: Replaced mutable `RemainingLeaves` column with persisted computed column `(TotalLeaves - UsedLeaves)` in `03_Hardening.sql` and updated repository write queries.
- **Rate Limiting**: Added ASP.NET Core built-in fixed-window rate limiter (5 requests / minute per remote IP) targeting `/api/auth/login`.

### v7 — Employee Portal + Attendance
- **Timezone Normalization**: Timezone resolved dynamically from config `Attendance:TimeZone` (default `Asia/Kolkata`) with dual support for IANA and Windows TZ IDs (`India Standard Time`).
- **Pure Attendance Calculation**: `AttendanceCalculator` encapsulates shift start (09:30), grace limit (15m -> 09:45), working hours status tiers (>=8h Present, >=4h HalfDay, <4h Absent), derived day status (`MissingCheckOut` on past unpunched days, `OnLeave`, `Weekend`), and 7-day regularization window.
- **Atomic Regularization Overwrites**: Approved regularizations atomically update request status and upsert the corresponding `Attendance` record with `Source = 'Regularized'`.
- **Portal Summary Aggregation**: `IPortalRepository` composes profile, manager hierarchy, leave availability, current day punch widget, upcoming approved leave, and pending approval inbox counts.
- **Default Landing Page**: `/portal` configured as default destination for authenticated users across all roles, with interactive clock-in/out widget and leave progress metrics.

### v8 — Asset Management + Integration Testing
- **Filtered Unique Index for Open Assignments**: Enforced single open assignment per asset using `CREATE UNIQUE INDEX IF NOT EXISTS UQ_Asset_OpenAssignment ON AssetAssignments (AssetID) WHERE ReturnedAt IS NULL`. Any concurrent or duplicate assignment directly violates database uniqueness and yields HTTP 409 Conflict.
- **HR/Admin Role Governance**: Hardware asset inventory management, initial assignment, unassignment, and review of maintenance/return requests are restricted to `Admin` (HR operations).
- **Employee Hardware Lifecycle Self-Service**: Employees can view their active equipment via `GET /api/assets/mine` and `/my-assets`, raise `Repair` or `Return` requests for assets currently assigned to them, and cancel their own pending requests.
- **State Transitions on Request Review**:
  - Approving a `Return` request atomically marks the request `Approved`, closes the active `AssetAssignment` record by setting `ReturnedAt = GETUTCDATE()`, and returns the `Asset` status to `Available`.
  - Approving a `Repair` request atomically marks the request `Approved` and transitions the `Asset` status to `UnderRepair`.
- **Integration Test Project**: Introduced `backend/HrmsApi.IntegrationTests` using `Microsoft.AspNetCore.Mvc.Testing` against an isolated SQLite test database with aligned authentication tokens to test real database constraints:
  - Double assignment prevention via filtered unique index (409 Conflict).
  - Concurrent leave approvals (simultaneous approvals result in exactly one success).

### v9 — Helpdesk
- **Explicit Status Transition Table (Decision #7)**:
  - `Open -> InProgress -> Resolved -> Closed`.
  - Allowed transitions: `Open -> InProgress, Closed`; `InProgress -> Resolved, Closed`; `Resolved -> Closed, Open`; `Closed -> Open`.
  - Any invalid transition attempt throws HTTP 409 Conflict.
- **Reopen Window Enforcement**:
  - Reopening a ticket (`Resolved` or `Closed` -> `Open`) is restricted to 7 days (`Helpdesk:ReopenWindowDays`, default 7) from `ResolvedAt` / `UpdatedAt`. Attempting to reopen past 7 days yields HTTP 409 Conflict.
- **Admin-Only Internal Comments Isolation**:
  - Staff notes marked `IsInternal = true` are strictly Admin-only. Non-admins cannot author internal notes (403), and internal notes are filtered out and completely omitted from `GET /api/tickets/{id}` responses for employee requesters.
- **Single Satisfaction Feedback Post-Resolution**:
  - Rating (1–5 stars) and optional feedback comments can only be submitted once, exclusively by the employee who raised the ticket, and strictly after the ticket is in `Resolved` or `Closed` state. Submitting while in `Open`/`InProgress` or rating twice yields HTTP 409 Conflict.
- **Administrative Triage Governance**:
  - Only Admins can reassign tickets or adjust priorities/statuses via `PATCH /api/tickets/{id}`. Non-admin calls are forbidden (403). Employees can only view their own tickets (`GET /api/tickets`).

## Future Scope (Deferred)
- Goals and OKR tracking.
- Payroll generation and tax deductions.
- Multi-channel push/email notification queues.
- Helpdesk file attachments.

