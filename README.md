# Human Resource Management System (HRMS) — Complete Enterprise Application

A full-stack Human Resource Management System (HRMS) built according to the **HRMS Design Document** and architectural requirements.

- **Frontend:** React 19 SPA (Vite)
- **Backend:** ASP.NET Core 10 Web API (C#)
- **Database:** Microsoft SQL Server
- **Data Access:** **Dapper ONLY** (Pure ADO.NET `SqlConnection`, parameterized SQL, atomic transactions, strictly no EF Core / DbContext)
- **Authentication:** JWT (JSON Web Tokens) with HMAC-SHA256
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
        └── SQL Server     (HrmsDb schema, constraints, relational integrity)
```

---

## 📂 Project Organization

```text
Sample- HRMS/
│
├── backend/
│   └── HrmsApi/
│       ├── Controllers/          # REST API endpoints (Auth, Employees, Documents, Leave)
│       ├── Services/             # Business logic layer & validation rules
│       ├── Repositories/         # Dapper data access & SQL transactions
│       ├── Models/               # Domain database entity models
│       ├── DTOs/                 # Request & response contracts
│       ├── Data/                 # IDbConnectionFactory & SqlConnectionFactory
│       ├── Middleware/           # Global exception handling middleware
│       ├── Helpers/              # JwtHelper, PasswordHasher (BCrypt)
│       ├── SQL/                  # Standalone database & seed SQL scripts
│       │   ├── 01_CreateSchema.sql
│       │   └── 02_SeedData.sql
│       ├── Storage/              # Secure local document upload directory
│       ├── appsettings.json      # Connection strings & JWT config
│       └── Program.cs            # Dependency injection & HTTP pipeline
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
├── HRMS_Design_Document.md       # Master design specification
├── HRMS_Implementation_Roadmap.md # Implementation roadmap
└── README.md                     # Comprehensive project documentation
```

---

## 👥 Default Accounts & Credentials

The database seed script (`02_SeedData.sql`) populates three accounts with pre-hashed BCrypt passwords:

| Role | Email | Password | Access Scope |
|---|---|---|---|
| **Admin / HR** | `admin@hrms.com` | `Admin@123` | Full employee management, manager assignment, document management, leave approvals, all-company visibility |
| **Manager** | `manager@hrms.com` | `Manager@123` | Direct reports view, approve/reject team leave, document access, personal profile |
| **Employee** | `employee@hrms.com` | `Employee@123` | Personal profile, apply for leave, view leave balance, download documents |

> **Quick Demo Login:** The Web Login screen provides **1-click Quick Demo Fill** buttons for Admin, Manager, and Employee to facilitate instantaneous testing.

---

## 🗄️ Database Setup (Microsoft SQL Server)

The database scripts are in `backend/HrmsApi/SQL/`. They are executable in SSMS, Azure Data Studio, or `sqlcmd`.

### 1. Create Schema & Tables
Execute [`backend/HrmsApi/SQL/01_CreateSchema.sql`](file:///c:/Users/Admin/Desktop/Sem%204/Projects/Sample-%20HRMS/backend/HrmsApi/SQL/01_CreateSchema.sql):
- Creates `HrmsDb` database.
- Creates `Users`, `Employees`, `Documents`, `LeaveBalance`, and `LeaveRequests` tables.
- Applies unique constraints (`Users.Email`, `Employees.UserID`, `LeaveBalance.EmployeeID`).
- Creates foreign keys, cascade rules, self-referencing `ManagerID`, and performance indexes.

### 2. Seed Initial Users & Balances
Execute [`backend/HrmsApi/SQL/02_SeedData.sql`](file:///c:/Users/Admin/Desktop/Sem%204/Projects/Sample-%20HRMS/backend/HrmsApi/SQL/02_SeedData.sql):
- Inserts Admin, Manager, and Employee users with BCrypt hashes.
- Inserts linked employee profiles and associates the manager reporting hierarchy.
- Inserts initial leave balance records.

### 3. Verify Connection String
Verify or adjust `backend/HrmsApi/appsettings.json`:
```json
"ConnectionStrings": {
  "DefaultConnection": "Server=localhost;Database=HrmsDb;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true;"
}
```

---

## 🚀 Running the Application

### Step 1: Start Backend API
```powershell
cd "backend/HrmsApi"
dotnet run
```
*The API will start listening on `http://localhost:5000` (or configured port).*

### Step 2: Start Frontend Client
```powershell
cd "frontend"
npm run dev
```
*Open `http://localhost:5173` in your browser.*

---

## 📡 API Endpoint Reference

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Authorization | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Validates email & BCrypt password, returns JWT token & user profile |
| `POST` | `/api/auth/logout` | Authenticated | Invalidates client session |
| `GET` | `/api/auth/me` | Authenticated | Returns logged-in user profile from claims |

### 👥 Employee Management (`/api/employees`)
| Method | Endpoint | Authorization | Description |
|---|---|---|---|
| `GET` | `/api/employees` | Authenticated | Returns employees (Admin: all, Manager: direct reports, Employee: self) |
| `GET` | `/api/employees/{id}` | Authenticated | Returns single employee (role-guarded) |
| `GET` | `/api/employees/me` | Authenticated | Returns current user's employee profile |
| `POST` | `/api/employees` | Admin Only | Creates User + Employee + LeaveBalance in an **atomic Dapper transaction** |
| `PUT` | `/api/employees/{id}` | Admin Only | Updates department, position, salary, and manager assignment |
| `PATCH` | `/api/employees/{id}/status` | Admin Only | Sets employee status to `Active` or `Inactive` |

### 📑 Documents & Policies (`/api/documents`)
| Method | Endpoint | Authorization | Description |
|---|---|---|---|
| `GET` | `/api/documents` | Authenticated | Lists active documents metadata (never exposes internal file paths) |
| `GET` | `/api/documents/{id}` | Authenticated | Returns single document metadata |
| `GET` | `/api/documents/{id}/download` | Authenticated | Streams physical binary file securely |
| `POST` | `/api/documents/upload` | Admin Only | Uploads document (PDF, JPEG, PNG, max 10MB) to secure local storage |
| `PUT` | `/api/documents/{id}` | Admin Only | Edits document title and category |
| `PATCH` | `/api/documents/{id}/deactivate` | Admin Only | Soft-deletes/hides document |

### 🌴 Leave Management (`/api/leave`)
| Method | Endpoint | Authorization | Description |
|---|---|---|---|
| `GET` | `/api/leave` | Authenticated | Returns leave requests (Admin: all, Manager: team reports, Employee: own) |
| `GET` | `/api/leave/balance` | Authenticated | Returns employee's current leave balance |
| `POST` | `/api/leave` | Authenticated | Submits leave request with date & balance validation |
| `PUT` | `/api/leave/{id}/approve` | Admin, Manager | Approves leave and deducts leave balance in an **atomic Dapper transaction** |
| `PUT` | `/api/leave/{id}/reject` | Admin, Manager | Rejects leave request (balance remains untouched) |

---

## 🔒 Security & Data Integrity Features

1. **Strict Dapper Usage:**
   - 100% of SQL commands use parameterized queries (`@Parameter`), eliminating SQL injection risks.
   - Zero Entity Framework Core or ORM reflection overhead.

2. **Atomic Dapper Transactions:**
   - **Employee Creation:** Inserts into `Users`, `Employees`, and `LeaveBalance` in a single SQL transaction. If any step fails, the entire transaction rolls back.
   - **Leave Approval:** Updates `LeaveRequests` to `Approved` and decrements `LeaveBalance.RemainingLeaves` in a single SQL transaction. If balance is insufficient, the transaction rolls back.

3. **File Storage Isolation:**
   - Uploaded files are stored in `Storage/Documents/` outside the web root.
   - Filenames are sanitized using GUIDs.
   - Physical filesystem paths are never returned in API responses.
   - Downloads are streamed through ASP.NET Core `FileStreamResult`.

4. **Robust Role-Based Access Control:**
   - Validated server-side on every endpoint via ASP.NET Core `[Authorize(Roles = "...")]`.
   - Validated client-side via React `ProtectedRoute` components and dynamic sidebar navigation.

5. **Centralized Error Handling:**
   - `ExceptionMiddleware` catches unhandled server exceptions, logs diagnostics, and returns clean, uniform JSON responses without exposing internal stack traces.

---

## 🧪 Testing Verification

- **Backend Build:** Verified with `dotnet build -c Debug /p:UseSharedCompilation=false` → `0 Error(s), 0 Warning(s)`.
- **Frontend Build:** Verified with `vite build` → Production bundle generated in `frontend/dist/` with `0 errors`.
- **Role Scenarios Covered:**
  - Admin: Can onboard employees, modify salaries/managers, deactivate staff, upload company policies, and approve/reject all leave.
  - Manager: Can only view direct reports, cannot see other teams' salaries, can approve/reject direct reports' leaves.
  - Employee: Can only view personal profile, view company policies, and apply for leave within allocated quota.
