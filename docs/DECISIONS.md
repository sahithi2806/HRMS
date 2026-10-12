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

## Future Scope (Deferred)
- Goals and OKR tracking.
- Payroll generation and tax deductions.
- Multi-channel push/email notification queues.
- Helpdesk file attachments.
