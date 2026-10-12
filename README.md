# Human Resource Management System (HRMS) — Complete Enterprise Application

A full-stack Human Resource Management System (HRMS) built according to the **HRMS Master Specification** and Keka-inspired architectural requirements.

- **Frontend:** React 19 SPA (Vite)
- **Backend:** ASP.NET Core 10 Web API (C#)
- **Database:** Microsoft SQL Server (production) / SQLite (development)
- **Data Access:** **Dapper ONLY** (Pure ADO.NET, parameterized SQL, atomic transactions, strictly no EF Core / DbContext)
- **Authentication:** JWT (JSON Web Tokens) with HMAC-SHA256, fail-fast secret verification, and per-request active token validation
- **Password Security:** BCrypt (`BCrypt.Net-Next`, work factor 11)
- **File Storage:** Local filesystem storage outside web root (`Storage/Documents/`)
- **API Style:** RESTful HTTP JSON

---

## 🏗️ Architecture & Component Flow

```text
React 19 SPA (Vite)
        │
        ▼
   Axios Client (Bearer Interceptor)
        │
        ▼
ASP.NET Core Web API
        │
        ├── Controllers    (REST contracts, DTO mapping, HTTP response codes)
        │       │
        │       ▼
        ├── Services       (Business logic, validation rules, workflow coordination)
        │       │
        │       ▼
        ├── Repositories   (Dapper queries, IDbTransaction management)
        │       │
        │       ▼
        ├── Dapper         (Parameterized SQL execution, Micro-ORM)
        │       │
        │       ▼
        └── SQL Server / SQLite (HrmsDb schema, constraints, relational integrity)
```

---

## 📂 Project Organization

```text
Sample- HRMS/
│
├── backend/
│   ├── HrmsApi/
│   │   ├── Controllers/          # REST API endpoints (Auth, Employees, Documents, Leave)
│   │   ├── Services/             # Business logic layer & validation rules
│   │   ├── Repositories/         # Dapper data access & SQL transactions
│   │   ├── Models/               # Domain database entity models
│   │   ├── DTOs/                 # Request & response contracts
│   │   ├── Data/                 # IDbConnectionFactory, SqlConnectionFactory, SqliteConnectionFactory
│   │   ├── Middleware/           # Global exception handling middleware (maps 400, 404, 403, 409, 500)
│   │   ├── Helpers/              # JwtHelper, PasswordHasher, BusinessDays, ApprovalPolicy, ConflictException
│   │   ├── SQL/                  # Idempotent database migration & seed SQL scripts
│   │   │   ├── 01_CreateSchema.sql
│   │   │   ├── 02_SeedData.sql
│   │   │   ├── 03_Hardening.sql    # Schema hardening, persisted computed columns, audit columns
│   │   │   └── 04_Attendance.sql   # Attendance & regularization tables, unique work-date indexes
│   │   ├── Storage/                # Secure local document upload directory
│   │   ├── appsettings.json        # Connection strings & configuration (placeholders for secrets)
│   │   └── Program.cs              # Dependency injection, rate limiting, JWT validation & pipeline
│   │
│   └── HrmsApi.Tests/              # xUnit + Moq unit test suite (72 tests)
│
├── frontend/
│   └── src/
│       ├── components/           # Navbar, Sidebar, ProtectedRoute
│       ├── context/              # AuthContext (session state & role guards)
│       ├── pages/                # LoginPage, EmployeesPage, DocumentsPage, LeavePage, ProfilePage, NotFoundPage
│       ├── services/             # Axios instance with Bearer interceptors
│       ├── App.jsx               # App layout & role-based route definitions
│       ├── main.jsx              # Application bootstrap
│       └── index.css             # Enterprise design system & tokens
│
├── docs/                         # Technical documentation & decision logs
│   ├── AGY_HRMS_Keka_Modules_Prompt.md
│   └── DECISIONS.md
├── README.md                     # Comprehensive project documentation
└── skills-lock.json
```

---

## 👥 Default Accounts & Credentials

The database seed scripts populate default accounts with pre-hashed BCrypt passwords:

| Role | Email | Password | Access Scope |
|---|---|---|---|
| **Admin / HR** | `admin@hrms.com` | `Admin@123` | Full employee management, manager assignment, document management, leave approvals, all-company visibility |
| **Manager** | `manager@hrms.com` | `Manager@123` | Direct reports view, approve/reject team leave, document access, personal profile |
| **Employee** | `employee@hrms.com` | `Employee@123` | Personal profile, apply for leave, view leave balance, download documents |

> **Quick Demo Login:** The Web Login screen provides **1-click Quick Demo Fill** buttons for Admin, Manager, and Employee to facilitate instantaneous testing.

---

## 🗄️ Database Setup (Microsoft SQL Server)

The database scripts are in `backend/HrmsApi/SQL/`. Execute them in exact order in SSMS, Azure Data Studio, or `sqlcmd`:

### 1. Create Schema & Tables
Execute [`backend/HrmsApi/SQL/01_CreateSchema.sql`](file:///c:/Users/Admin/Desktop/Sem%204/Projects/Sample-%20HRMS/backend/HrmsApi/SQL/01_CreateSchema.sql):
- Creates `HrmsDb` database.
- Creates `Users`, `Employees`, `Documents`, `LeaveBalance`, and `LeaveRequests` tables.

### 2. Seed Initial Users & Balances
Execute [`backend/HrmsApi/SQL/02_SeedData.sql`](file:///c:/Users/Admin/Desktop/Sem%204/Projects/Sample-%20HRMS/backend/HrmsApi/SQL/02_SeedData.sql):
- Inserts Admin, Manager, and Employee users with BCrypt hashes.
- Inserts linked employee profiles and associates the manager reporting hierarchy.
- Inserts initial leave balance records.

### 3. Apply Schema Hardening (v6)
Execute [`backend/HrmsApi/SQL/03_Hardening.sql`](file:///c:/Users/Admin/Desktop/Sem%204/Projects/Sample-%20HRMS/backend/HrmsApi/SQL/03_Hardening.sql):
- Adds audit and deactivation columns: `DeactivatedAt`, `ExitReason`, `CreatedAt` to `Employees`.
- Adds `Days`, `ManagerComment`, `CreatedAt` to `LeaveRequests`, backfilling business days without dependency on `DATEFIRST`.
- Replaces stored `RemainingLeaves` with a persisted computed column: `(TotalLeaves - UsedLeaves) PERSISTED`.
- Replaces `CASCADE` delete foreign keys with `NO ACTION` (soft-delete enforcement).
- Adds check constraints: `Salary > 0`, `StartDate <= EndDate`, `UsedLeaves >= 0 AND UsedLeaves <= TotalLeaves`.

---

## 🔐 Configuration & JWT Secret Setup

> **Security Notice (v6 Key Rotation):** The previous hardcoded JWT secret committed in source control has been revoked and removed. `appsettings.json` now contains a placeholder. The API enforces fail-fast startup: it refuses to boot if the JWT key is missing, left as a placeholder, or shorter than 32 characters.

### Setting Up Development Secrets:
In development, set the key using .NET User Secrets:
```powershell
cd "backend/HrmsApi"
dotnet user-secrets set "Jwt:Key" "Aether_HRMS_Rotated_Super_Secret_Key_For_Jwt_Auth_2026_Secure!"
```

Or set the environment variable:
```powershell
$env:Jwt__Key = "Aether_HRMS_Rotated_Super_Secret_Key_For_Jwt_Auth_2026_Secure!"
```

---

## 🚀 Running the Application

### Step 1: Start Backend API
```powershell
cd "backend/HrmsApi"
dotnet run
```
*The API will start listening on `http://localhost:5000` (or `http://localhost:5160`).*
*In Development mode, Swagger UI with Bearer authentication is accessible at `/swagger`.*

### Step 2: Start Frontend Client
```powershell
cd "frontend"
npm install
npm run dev
```
*Open `http://localhost:5173` in your browser.*

---

## 🧪 Testing & Verification

### Run Backend Unit Tests:
```powershell
cd "backend/HrmsApi.Tests"
dotnet test
```
*Executes all 49 unit tests across Employee rules, Leave balance availability, BusinessDays calculations, ApprovalPolicy authorization, JWT generation, and BCrypt password hashing.*

### Run Frontend Linting & Build:
```powershell
cd "frontend"
npm run lint
npm run build
```

---

## 🛡️ Hardening Features & Business Rules (v6)

1. **Shared Approval Policy (Decision #1):**
   - The direct reporting manager approves/rejects requests.
   - If an employee has no manager (e.g., executive or unassigned), an Admin may act.
   - **Nobody can approve their own request (including Admins).**
   - Non-report managers and Admins (when employee has a manager) are strictly read-only (403 Forbidden).

2. **Business Days & Leave Availability (Decision #2):**
   - Weekends (Saturday and Sunday) do not count toward leave duration.
   - Leave requests store business `Days`.
   - Leave availability at submission: `AvailableToRequest = RemainingLeaves - PendingDays`.
   - Overlapping leave with existing Pending/Approved requests is blocked (400).

3. **Real-time Deactivation Check:**
   - Deactivated users are rejected on **every single request** via the JWT `OnTokenValidated` hook querying employee status.

4. **Employee Lifecycle Rules (Decision #11):**
   - Deactivation is blocked (409 Conflict) if the employee has active direct reports.
   - Deactivation of the last active Admin is blocked (409 Conflict).
   - Manager assignment validates active status, role (Manager/Admin), non-self, and hierarchy cycle prevention.
   - Positive salary check (`Salary > 0`) enforced in business logic and database constraint.
   - Employee creation provisions `LeaveBalance` using `Leave:AnnualAllocation` (default 24).

5. **Rate Limiting & Security Headers:**
   - Login endpoint throttles brute force attacks to **5 requests/minute/IP** (returns 429 Too Many Requests).
   - Security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`.
   - Outside Development, automatic HTTPS redirection and HSTS are enforced.
