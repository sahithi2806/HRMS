using System.Data;
using System.IO;
using Dapper;
using HrmsApi.Helpers;

namespace HrmsApi.Data;

public static class DatabaseInitializer
{
    public static void Initialize(IDbConnectionFactory connectionFactory)
    {
        if (connectionFactory.Provider != "Sqlite")
        {
            return;
        }

        using var connection = connectionFactory.CreateConnection();
        if (connection.State != ConnectionState.Open)
        {
            connection.Open();
        }

        // 1. Create tables
        const string schemaSql = """
            CREATE TABLE IF NOT EXISTS Users (
                UserID INTEGER PRIMARY KEY AUTOINCREMENT,
                Name TEXT NOT NULL,
                Email TEXT NOT NULL UNIQUE,
                PasswordHash TEXT NOT NULL,
                Role TEXT NOT NULL CHECK (Role IN ('Admin', 'Manager', 'Employee')),
                CreatedAt TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
            );

            CREATE TABLE IF NOT EXISTS Employees (
                EmployeeID INTEGER PRIMARY KEY AUTOINCREMENT,
                UserID INTEGER NOT NULL UNIQUE,
                Department TEXT NOT NULL,
                Position TEXT NOT NULL,
                JoiningDate TEXT NOT NULL,
                Salary REAL NOT NULL CHECK (Salary > 0),
                Status TEXT NOT NULL DEFAULT 'Active' CHECK (Status IN ('Active', 'Inactive')),
                ManagerID INTEGER NULL,
                DeactivatedAt TEXT NULL,
                ExitReason TEXT NULL,
                CreatedAt TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                FOREIGN KEY (UserID) REFERENCES Users(UserID),
                FOREIGN KEY (ManagerID) REFERENCES Employees(EmployeeID)
            );

            CREATE TABLE IF NOT EXISTS Documents (
                DocumentID INTEGER PRIMARY KEY AUTOINCREMENT,
                Title TEXT NOT NULL,
                Category TEXT NOT NULL,
                FilePath TEXT NOT NULL,
                OriginalFileName TEXT NULL,
                ContentType TEXT NULL,
                FileSizeBytes INTEGER NULL,
                UploadedBy INTEGER NOT NULL,
                UploadedAt TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                IsActive INTEGER NOT NULL DEFAULT 1,
                FOREIGN KEY (UploadedBy) REFERENCES Users(UserID)
            );

            CREATE TABLE IF NOT EXISTS LeaveBalance (
                LeaveBalanceID INTEGER PRIMARY KEY AUTOINCREMENT,
                EmployeeID INTEGER NOT NULL UNIQUE,
                TotalLeaves INTEGER NOT NULL DEFAULT 24,
                UsedLeaves INTEGER NOT NULL DEFAULT 0,
                RemainingLeaves INTEGER NOT NULL DEFAULT 24,
                FOREIGN KEY (EmployeeID) REFERENCES Employees(EmployeeID)
            );

            CREATE TABLE IF NOT EXISTS LeaveRequests (
                LeaveID INTEGER PRIMARY KEY AUTOINCREMENT,
                EmployeeID INTEGER NOT NULL,
                LeaveType TEXT NOT NULL CHECK (LeaveType IN ('Casual', 'Sick', 'Earned', 'Annual', 'Maternity', 'Paternity', 'Unpaid')),
                StartDate TEXT NOT NULL,
                EndDate TEXT NOT NULL,
                Days INTEGER NOT NULL DEFAULT 1,
                Reason TEXT NOT NULL,
                Status TEXT NOT NULL DEFAULT 'Pending' CHECK (Status IN ('Pending', 'Approved', 'Rejected')),
                ApprovedBy INTEGER NULL,
                ApprovedAt TEXT NULL,
                ManagerComment TEXT NULL,
                CreatedAt TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                FOREIGN KEY (EmployeeID) REFERENCES Employees(EmployeeID),
                FOREIGN KEY (ApprovedBy) REFERENCES Employees(EmployeeID)
            );

            CREATE TABLE IF NOT EXISTS Attendance (
                AttendanceID INTEGER PRIMARY KEY AUTOINCREMENT,
                EmployeeID INTEGER NOT NULL,
                WorkDate TEXT NOT NULL,
                CheckInAt TEXT NOT NULL,
                CheckOutAt TEXT NULL,
                IsLate INTEGER NOT NULL DEFAULT 0,
                Status TEXT NULL CHECK (Status IN ('Present', 'HalfDay', 'Absent')),
                Source TEXT NOT NULL DEFAULT 'Self' CHECK (Source IN ('Self', 'Regularized')),
                CreatedAt TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                UNIQUE (EmployeeID, WorkDate),
                FOREIGN KEY (EmployeeID) REFERENCES Employees(EmployeeID)
            );

            CREATE TABLE IF NOT EXISTS AttendanceRegularizations (
                RegularizationID INTEGER PRIMARY KEY AUTOINCREMENT,
                EmployeeID INTEGER NOT NULL,
                WorkDate TEXT NOT NULL,
                RequestedCheckIn TEXT NOT NULL,
                RequestedCheckOut TEXT NOT NULL,
                Reason TEXT NOT NULL,
                Status TEXT NOT NULL DEFAULT 'Pending' CHECK (Status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')),
                ApprovedBy INTEGER NULL,
                ApprovedAt TEXT NULL,
                ManagerComment TEXT NULL,
                CreatedAt TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                FOREIGN KEY (EmployeeID) REFERENCES Employees(EmployeeID),
                FOREIGN KEY (ApprovedBy) REFERENCES Employees(EmployeeID)
            );

            CREATE TABLE IF NOT EXISTS Assets (
                AssetID INTEGER PRIMARY KEY AUTOINCREMENT,
                AssetTag TEXT NOT NULL UNIQUE,
                Name TEXT NOT NULL,
                Category TEXT NOT NULL CHECK (Category IN ('Laptop', 'Mobile', 'Monitor', 'Accessory', 'Other')),
                SerialNumber TEXT NULL,
                PurchaseDate TEXT NULL,
                Status TEXT NOT NULL DEFAULT 'Available' CHECK (Status IN ('Available', 'Assigned', 'UnderRepair', 'Retired')),
                CreatedAt TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
            );

            CREATE TABLE IF NOT EXISTS AssetAssignments (
                AssignmentID INTEGER PRIMARY KEY AUTOINCREMENT,
                AssetID INTEGER NOT NULL,
                EmployeeID INTEGER NOT NULL,
                AssignedAt TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                AssignedBy INTEGER NOT NULL,
                ReturnedAt TEXT NULL,
                FOREIGN KEY (AssetID) REFERENCES Assets(AssetID),
                FOREIGN KEY (EmployeeID) REFERENCES Employees(EmployeeID),
                FOREIGN KEY (AssignedBy) REFERENCES Employees(EmployeeID)
            );

            CREATE UNIQUE INDEX IF NOT EXISTS UQ_Asset_OpenAssignment 
            ON AssetAssignments (AssetID) 
            WHERE ReturnedAt IS NULL;

            CREATE TABLE IF NOT EXISTS AssetRequests (
                AssetRequestID INTEGER PRIMARY KEY AUTOINCREMENT,
                AssetID INTEGER NOT NULL,
                EmployeeID INTEGER NOT NULL,
                RequestType TEXT NOT NULL CHECK (RequestType IN ('Repair', 'Return')),
                Description TEXT NOT NULL,
                Status TEXT NOT NULL DEFAULT 'Pending' CHECK (Status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')),
                ReviewedBy INTEGER NULL,
                ReviewedAt TEXT NULL,
                AdminComment TEXT NULL,
                CreatedAt TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                FOREIGN KEY (AssetID) REFERENCES Assets(AssetID),
                FOREIGN KEY (EmployeeID) REFERENCES Employees(EmployeeID),
                FOREIGN KEY (ReviewedBy) REFERENCES Employees(EmployeeID)
            );
            """;

        connection.Execute(schemaSql);

        // Apply column additions for existing SQLite databases (idempotent)
        void TryAddColumn(string table, string column, string type)
        {
            try
            {
                connection.Execute($"ALTER TABLE {table} ADD COLUMN {column} {type};");
            }
            catch
            {
                // Ignored if column already exists
            }
        }

        TryAddColumn("Employees", "DeactivatedAt", "TEXT NULL");
        TryAddColumn("Employees", "ExitReason", "TEXT NULL");
        TryAddColumn("Employees", "CreatedAt", "TEXT NULL");
        connection.Execute("UPDATE Employees SET CreatedAt = datetime('now') WHERE CreatedAt IS NULL;");

        TryAddColumn("Documents", "OriginalFileName", "TEXT NULL");
        TryAddColumn("Documents", "ContentType", "TEXT NULL");
        TryAddColumn("Documents", "FileSizeBytes", "INTEGER NULL");

        TryAddColumn("LeaveRequests", "Days", "INTEGER NOT NULL DEFAULT 1");
        TryAddColumn("LeaveRequests", "ManagerComment", "TEXT NULL");
        TryAddColumn("LeaveRequests", "CreatedAt", "TEXT NULL");
        connection.Execute("UPDATE LeaveRequests SET CreatedAt = datetime('now') WHERE CreatedAt IS NULL;");

        // Backfill Days using BusinessDays helper
        var rowsToBackfill = connection.Query<(int LeaveID, string StartDate, string EndDate)>("SELECT LeaveID, StartDate, EndDate FROM LeaveRequests WHERE Days IS NULL OR Days = 0;");
        foreach (var row in rowsToBackfill)
        {
            if (DateTime.TryParse(row.StartDate, out var s) && DateTime.TryParse(row.EndDate, out var e))
            {
                var days = BusinessDays.Calculate(s, e);
                connection.Execute("UPDATE LeaveRequests SET Days = @Days WHERE LeaveID = @LeaveID;", new { Days = days, row.LeaveID });
            }
        }

        // Pre-computed BCrypt Hashes:
        // Admin@123:    $2a$11$/N1c9972tXpqxLh74x5kEe7bWJndRfxfrOdIlBu9hhqay2egmt/bO
        // Manager@123:  $2a$11$JKcdrN9QmoUVCDYlHMBGKOhOwrs8pwyHeaxnSFFkXDk5O3vnMbZ2C
        // Employee@123: $2a$11$LF3glo5/GAPSDmwh4F79g.YAlWLNfVPSQjPQTozbIMlOwmsTZakNK

        const string hashAdmin = "$2a$11$/N1c9972tXpqxLh74x5kEe7bWJndRfxfrOdIlBu9hhqay2egmt/bO";
        const string hashManager = "$2a$11$JKcdrN9QmoUVCDYlHMBGKOhOwrs8pwyHeaxnSFFkXDk5O3vnMbZ2C";
        const string hashEmployee = "$2a$11$LF3glo5/GAPSDmwh4F79g.YAlWLNfVPSQjPQTozbIMlOwmsTZakNK";

        // 2. Seed Users (1 Admin, 6 Managers, 20 Employees)
        const string seedUsersSql = $"""
            INSERT OR IGNORE INTO Users (UserID, Name, Email, PasswordHash, Role, CreatedAt) VALUES
            -- HR Admin
            (1, 'Rajesh Sharma', 'admin@hrms.com', '{hashAdmin}', 'Admin', '2023-01-01 00:00:00'),

            -- 6 Indian Managers
            (2, 'Vikramaditya Verma', 'manager@hrms.com', '{hashManager}', 'Manager', '2023-01-10 00:00:00'),
            (3, 'Ananya Deshmukh', 'a.deshmukh@hrms.com', '{hashManager}', 'Manager', '2023-01-15 00:00:00'),
            (4, 'Rajeshwar Rao', 'r.rao@hrms.com', '{hashManager}', 'Manager', '2023-02-01 00:00:00'),
            (5, 'Sunita Krishnan', 's.krishnan@hrms.com', '{hashManager}', 'Manager', '2023-02-15 00:00:00'),
            (6, 'Venkatraman Iyer', 'v.iyer@hrms.com', '{hashManager}', 'Manager', '2023-03-01 00:00:00'),
            (7, 'Meenakshi Sundaram', 'm.sundaram@hrms.com', '{hashManager}', 'Manager', '2023-03-15 00:00:00'),

            -- 20 Indian Employees
            (8, 'Saha Reddy', 'employee@hrms.com', '{hashEmployee}', 'Employee', '2024-01-10 00:00:00'),
            (9, 'Aarav Sharma', 'a.sharma@hrms.com', '{hashEmployee}', 'Employee', '2024-01-12 00:00:00'),
            (10, 'Rohan Gupta', 'r.gupta@hrms.com', '{hashEmployee}', 'Employee', '2024-01-15 00:00:00'),
            (11, 'Kavya Nair', 'k.nair@hrms.com', '{hashEmployee}', 'Employee', '2024-02-01 00:00:00'),
            (12, 'Rahul Banerjee', 'r.banerjee@hrms.com', '{hashEmployee}', 'Employee', '2024-02-10 00:00:00'),
            (13, 'Priyanka Kulkarni', 'p.kulkarni@hrms.com', '{hashEmployee}', 'Employee', '2024-02-15 00:00:00'),
            (14, 'Aditya Joshi', 'a.joshi@hrms.com', '{hashEmployee}', 'Employee', '2024-03-01 00:00:00'),
            (15, 'Sneha Mukherjee', 's.mukherjee@hrms.com', '{hashEmployee}', 'Employee', '2024-03-05 00:00:00'),
            (16, 'Siddharth Malhotra', 's.malhotra@hrms.com', '{hashEmployee}', 'Employee', '2024-03-10 00:00:00'),
            (17, 'Tanvi Kapoor', 't.kapoor@hrms.com', '{hashEmployee}', 'Employee', '2024-03-15 00:00:00'),
            (18, 'Ishaan Verma', 'i.verma@hrms.com', '{hashEmployee}', 'Employee', '2024-04-01 00:00:00'),
            (19, 'Deepa Pillai', 'd.pillai@hrms.com', '{hashEmployee}', 'Employee', '2024-04-05 00:00:00'),
            (20, 'Arjun Singhania', 'a.singhania@hrms.com', '{hashEmployee}', 'Employee', '2024-04-10 00:00:00'),
            (21, 'Niharika Agarwal', 'n.agarwal@hrms.com', '{hashEmployee}', 'Employee', '2024-04-15 00:00:00'),
            (22, 'Karthik Raja', 'k.raja@hrms.com', '{hashEmployee}', 'Employee', '2024-05-01 00:00:00'),
            (23, 'Varun Mehta', 'v.mehta@hrms.com', '{hashEmployee}', 'Employee', '2024-05-10 00:00:00'),
            (24, 'Divya Choudhury', 'd.choudhury@hrms.com', '{hashEmployee}', 'Employee', '2024-05-15 00:00:00'),
            (25, 'Ritu Saxena', 'r.saxena@hrms.com', '{hashEmployee}', 'Employee', '2024-06-01 00:00:00'),
            (26, 'Manoj Nambiar', 'm.nambiar@hrms.com', '{hashEmployee}', 'Employee', '2024-06-10 00:00:00'),
            (27, 'Akash Patel', 'a.patel@hrms.com', '{hashEmployee}', 'Employee', '2024-06-15 00:00:00');
            """;
        connection.Execute(seedUsersSql);

        // 3. Seed Employees with CTC Salaries in Rupees (₹)
        const string seedEmployeesSql = """
            INSERT OR IGNORE INTO Employees (EmployeeID, UserID, Department, Position, JoiningDate, Salary, Status, ManagerID) VALUES
            (1, 1, 'Human Resources', 'HR Director', '2023-01-01', 3200000.00, 'Active', NULL),
            (2, 2, 'Engineering', 'Engineering Lead', '2023-01-10', 3600000.00, 'Active', NULL),
            (3, 3, 'Product', 'Product Director', '2023-01-15', 3200000.00, 'Active', NULL),
            (4, 4, 'Sales', 'Country Sales Manager', '2023-02-01', 2800000.00, 'Active', NULL),
            (5, 5, 'Marketing', 'VP of Marketing', '2023-02-15', 3000000.00, 'Active', NULL),
            (6, 6, 'Finance', 'Financial Controller', '2023-03-01', 3400000.00, 'Active', NULL),
            (7, 7, 'Operations', 'Head of Operations', '2023-03-15', 2700000.00, 'Active', NULL),
            (8, 8, 'Engineering', 'Senior Software Engineer', '2024-01-10', 1800000.00, 'Active', 2),
            (9, 9, 'Engineering', 'Frontend Tech Lead', '2024-01-12', 2400000.00, 'Active', 2),
            (10, 10, 'Engineering', 'Backend Engineer', '2024-01-15', 1500000.00, 'Active', 2),
            (11, 11, 'Engineering', 'Cloud DevOps Engineer', '2024-02-01', 2000000.00, 'Active', 2),
            (23, 23, 'Engineering', 'SDET Lead', '2024-05-10', 1750000.00, 'Active', 2),
            (24, 24, 'Engineering', 'Cybersecurity Engineer', '2024-05-15', 2100000.00, 'Active', 2),
            (12, 12, 'Product', 'Lead UI/UX Designer', '2024-02-10', 1900000.00, 'Active', 3),
            (13, 13, 'Product', 'Senior Product Owner', '2024-02-15', 2200000.00, 'Active', 3),
            (14, 14, 'Sales', 'Enterprise Account Executive', '2024-03-01', 1600000.00, 'Active', 4),
            (15, 15, 'Sales', 'Business Development Lead', '2024-03-05', 1400000.00, 'Active', 4),
            (16, 16, 'Sales', 'Customer Success Specialist', '2024-03-10', 1200000.00, 'Active', 4),
            (17, 17, 'Marketing', 'Digital Marketing Lead', '2024-03-15', 1500000.00, 'Active', 5),
            (18, 18, 'Marketing', 'SEO & Growth Specialist', '2024-04-01', 1300000.00, 'Active', 5),
            (25, 25, 'Marketing', 'Brand Communications Manager', '2024-06-01', 1250000.00, 'Active', 5),
            (19, 19, 'Finance', 'Senior Financial Analyst', '2024-04-05', 1700000.00, 'Active', 6),
            (20, 20, 'Finance', 'Payroll & Statutory Compliance Lead', '2024-04-10', 1400000.00, 'Active', 6),
            (26, 26, 'Finance', 'GST & Tax Accountant', '2024-06-10', 1650000.00, 'Active', 6),
            (21, 21, 'Operations', 'Supply Chain Coordinator', '2024-04-15', 1100000.00, 'Active', 7),
            (22, 22, 'Operations', 'Facilities Specialist', '2024-05-01', 950000.00, 'Active', 7),
            (27, 27, 'Operations', 'Senior Systems Administrator', '2024-06-15', 1550000.00, 'Active', 7);
            """;
        connection.Execute(seedEmployeesSql);

        // 4. Seed Leave Balances for all 27 employees
        const string seedBalancesSql = """
            INSERT OR IGNORE INTO LeaveBalance (LeaveBalanceID, EmployeeID, TotalLeaves, UsedLeaves, RemainingLeaves) VALUES
            (1, 1, 25, 2, 23),
            (2, 2, 24, 3, 21),
            (3, 3, 24, 1, 23),
            (4, 4, 24, 4, 20),
            (5, 5, 24, 0, 24),
            (6, 6, 24, 2, 22),
            (7, 7, 24, 5, 19),
            (8, 8, 20, 3, 17),
            (9, 9, 20, 0, 20),
            (10, 10, 20, 2, 18),
            (11, 11, 20, 4, 16),
            (12, 12, 20, 1, 19),
            (13, 13, 20, 0, 20),
            (14, 14, 20, 5, 15),
            (15, 15, 20, 2, 18),
            (16, 16, 20, 0, 20),
            (17, 17, 20, 1, 19),
            (18, 18, 20, 3, 17),
            (19, 19, 20, 0, 20),
            (20, 20, 20, 2, 18),
            (21, 21, 20, 4, 16),
            (22, 22, 20, 0, 20),
            (23, 23, 20, 1, 19),
            (24, 24, 20, 0, 20),
            (25, 25, 20, 2, 18),
            (26, 26, 20, 0, 20),
            (27, 27, 20, 1, 19);
            """;
        connection.Execute(seedBalancesSql);

        // 5. Seed Indian Corporate Leave Requests
        const string seedLeaveRequestsSql = """
            INSERT OR IGNORE INTO LeaveRequests (LeaveID, EmployeeID, LeaveType, StartDate, EndDate, Days, Reason, Status, ApprovedBy, ApprovedAt, CreatedAt) VALUES
            (1, 8, 'Casual', '2026-10-20', '2026-10-22', 3, 'Attending Diwali festival celebrations with family in hometown.', 'Pending', NULL, NULL, '2026-10-15 10:00:00'),
            (2, 9, 'Sick', '2026-10-18', '2026-10-19', 1, 'Severe fever and viral infection under doctor consultation.', 'Pending', NULL, NULL, '2026-10-15 11:30:00'),
            (3, 12, 'Earned', '2026-11-01', '2026-11-05', 4, 'Annual family vacation trip to Kerala backwaters.', 'Pending', NULL, NULL, '2026-10-16 09:15:00'),
            (4, 14, 'Casual', '2026-10-25', '2026-10-26', 1, 'Property registration and Aadhaar biometric verification at Sub-Registrar office.', 'Pending', NULL, NULL, '2026-10-16 14:00:00'),
            (5, 17, 'Casual', '2026-10-28', '2026-10-29', 2, 'Home renovation supervision and solar rooftop installation.', 'Pending', NULL, NULL, '2026-10-17 12:00:00'),
            (6, 8, 'Casual', '2026-09-01', '2026-09-03', 3, 'Attending brother''s wedding ceremony in Hyderabad.', 'Approved', 2, '2026-08-28 10:30:00', '2026-08-25 09:00:00'),
            (7, 10, 'Sick', '2026-09-12', '2026-09-13', 1, 'Dental treatment and post-op rest.', 'Approved', 2, '2026-09-11 14:15:00', '2026-09-10 11:00:00'),
            (8, 15, 'Earned', '2026-08-10', '2026-08-14', 5, 'Monsoon trek in North Goa with family.', 'Approved', 4, '2026-08-01 09:00:00', '2026-07-28 15:30:00'),
            (9, 21, 'Casual', '2026-09-20', '2026-09-22', 2, 'House relocation to new apartment in Bengaluru.', 'Approved', 7, '2026-09-15 16:45:00', '2026-09-12 10:20:00'),
            (10, 11, 'Earned', '2026-10-01', '2026-10-10', 7, 'Leave requested during critical production infrastructure release.', 'Rejected', 2, '2026-09-25 11:20:00', '2026-09-20 16:00:00'),
            (11, 18, 'Casual', '2026-10-05', '2026-10-08', 4, 'Unscheduled absence during festive campaign launch week.', 'Rejected', 5, '2026-10-02 15:00:00', '2026-10-01 13:45:00');
            """;
        connection.Execute(seedLeaveRequestsSql);

        // 6. Copy actual PDF files from Storage to Storage/Documents
        var storageDir = Path.Combine(Directory.GetCurrentDirectory(), "Storage");
        var docsDir = Path.Combine(storageDir, "Documents");
        if (!Directory.Exists(docsDir))
        {
            Directory.CreateDirectory(docsDir);
        }

        string LinkStoragePdf(string pdfFileName)
        {
            var sourcePath = Path.Combine(storageDir, pdfFileName);
            var destPath = Path.Combine(docsDir, pdfFileName);

            if (File.Exists(sourcePath))
            {
                File.Copy(sourcePath, destPath, true);
            }
            return destPath;
        }

        var pdf1 = LinkStoragePdf("India_Employee_Handbook_2026.pdf");
        var pdf2 = LinkStoragePdf("IT_Security_and_POSH_Policy_Guide.pdf");
        var pdf3 = LinkStoragePdf("Indian_Labour_Code_and_Ethics_Framework.pdf");
        var pdf4 = LinkStoragePdf("Group_Mediclaim_and_Health_Insurance_Guide.pdf");
        var pdf5 = LinkStoragePdf("2026_Festival_Holiday_Calendar_and_Leave_Rules.pdf");

        // 7. Seed Documents with actual physical PDF file paths
        var seedDocsSql = $"""
            INSERT OR IGNORE INTO Documents (DocumentID, Title, Category, FilePath, UploadedBy, UploadedAt, IsActive) VALUES
            (1, 'India Employee Handbook 2026', 'HR Policies', '{pdf1.Replace(@"\", @"\\")}', 1, '2026-01-05 09:00:00', 1),
            (2, 'IT Security & POSH Policy Guide', 'IT & Compliance', '{pdf2.Replace(@"\", @"\\")}', 1, '2026-01-10 10:30:00', 1),
            (3, 'Indian Labour Code & Ethics Framework', 'Compliance', '{pdf3.Replace(@"\", @"\\")}', 1, '2026-01-15 11:15:00', 1),
            (4, 'Group Mediclaim & Health Insurance Guide', 'Benefits', '{pdf4.Replace(@"\", @"\\")}', 1, '2026-02-01 14:00:00', 1),
            (5, '2026 Festival Holiday Calendar & Leave Rules', 'HR Policies', '{pdf5.Replace(@"\", @"\\")}', 1, '2026-02-10 16:20:00', 1);
            """;
        connection.Execute(seedDocsSql);

        // 8. Seed Attendance and Regularization for current month
        const string seedAttendanceSql = """
            INSERT OR IGNORE INTO Attendance (AttendanceID, EmployeeID, WorkDate, CheckInAt, CheckOutAt, IsLate, Status, Source, CreatedAt) VALUES
            (1, 8, '2026-10-01', '2026-10-01 09:15:00', '2026-10-01 18:30:00', 0, 'Present', 'Self', '2026-10-01 09:15:00'),
            (2, 8, '2026-10-02', '2026-10-02 09:20:00', '2026-10-02 18:15:00', 0, 'Present', 'Self', '2026-10-02 09:20:00'),
            (3, 8, '2026-10-05', '2026-10-05 10:05:00', '2026-10-05 19:15:00', 1, 'Present', 'Self', '2026-10-05 10:05:00'),
            (4, 8, '2026-10-06', '2026-10-06 09:25:00', '2026-10-06 14:00:00', 0, 'HalfDay', 'Self', '2026-10-06 09:25:00'),
            (5, 8, '2026-10-07', '2026-10-07 09:10:00', '2026-10-07 18:45:00', 0, 'Present', 'Self', '2026-10-07 09:10:00'),
            (6, 8, '2026-10-08', '2026-10-08 09:30:00', '2026-10-08 18:30:00', 0, 'Present', 'Regularized', '2026-10-08 09:30:00'),
            (7, 8, '2026-10-09', '2026-10-09 09:15:00', '2026-10-09 18:20:00', 0, 'Present', 'Self', '2026-10-09 09:15:00'),
            -- Other engineering team members for Vikramaditya's team view on 2026-10-09
            (8, 9, '2026-10-09', '2026-10-09 09:20:00', '2026-10-09 18:30:00', 0, 'Present', 'Self', '2026-10-09 09:20:00'),
            (9, 10, '2026-10-09', '2026-10-09 10:10:00', '2026-10-09 19:00:00', 1, 'Present', 'Self', '2026-10-09 10:10:00'),
            (10, 11, '2026-10-09', '2026-10-09 09:10:00', '2026-10-09 18:15:00', 0, 'Present', 'Self', '2026-10-09 09:10:00');

            INSERT OR IGNORE INTO AttendanceRegularizations (RegularizationID, EmployeeID, WorkDate, RequestedCheckIn, RequestedCheckOut, Reason, Status, ApprovedBy, ApprovedAt, ManagerComment, CreatedAt) VALUES
            (1, 8, '2026-10-08', '2026-10-08 09:30:00', '2026-10-08 18:30:00', 'Biometric scanner glitch at main turnstile', 'Approved', 2, '2026-10-08 19:00:00', 'Verified with front desk register', '2026-10-08 18:35:00'),
            (2, 9, '2026-10-07', '2026-10-07 09:30:00', '2026-10-07 18:30:00', 'Worked from client site in Whitefield, biometric punch missed', 'Pending', NULL, NULL, NULL, '2026-10-08 10:00:00');
            """;
        connection.Execute(seedAttendanceSql);

        // 9. Seed Assets, Assignments, and Requests
        const string seedAssetsSql = """
            INSERT OR IGNORE INTO Assets (AssetID, AssetTag, Name, Category, SerialNumber, PurchaseDate, Status, CreatedAt) VALUES
            (1, 'AST-LP-001', 'MacBook Pro 16" M3 Max', 'Laptop', 'C02G10JPMD6M', '2024-01-15', 'Assigned', '2024-01-15 10:00:00'),
            (2, 'AST-LP-002', 'Dell XPS 15 9530', 'Laptop', 'DLXPS9530A12', '2024-02-01', 'Assigned', '2024-02-01 10:00:00'),
            (3, 'AST-MN-001', 'Dell UltraSharp 27" 4K Monitor', 'Monitor', 'U2723QE88219', '2024-02-10', 'Assigned', '2024-02-10 11:00:00'),
            (4, 'AST-LP-003', 'Lenovo ThinkPad X1 Carbon Gen 11', 'Laptop', 'PF49B11XCARBON', '2024-03-01', 'Available', '2024-03-01 09:00:00'),
            (5, 'AST-MB-001', 'iPhone 15 Pro (Test Device)', 'Mobile', 'F17M8821TEST', '2024-03-15', 'Available', '2024-03-15 14:00:00'),
            (6, 'AST-MN-002', 'LG 34" UltraWide Curved Monitor', 'Monitor', 'LG34WN80C991', '2024-04-01', 'UnderRepair', '2024-04-01 12:00:00'),
            (7, 'AST-AC-001', 'Logitech MX Master 3S + Keys Combo', 'Accessory', 'MXM3S881920', '2024-04-10', 'Assigned', '2024-04-10 15:00:00');

            -- Asset 1 assigned to Saha Reddy (Employee 8)
            -- Asset 2 assigned to Vikramaditya Verma (Employee 2)
            -- Asset 3 assigned to Saha Reddy (Employee 8)
            -- Asset 7 assigned to Saha Reddy (Employee 8)
            INSERT OR IGNORE INTO AssetAssignments (AssignmentID, AssetID, EmployeeID, AssignedAt, AssignedBy, ReturnedAt) VALUES
            (1, 1, 8, '2024-01-16 10:00:00', 1, NULL),
            (2, 2, 2, '2024-02-02 11:00:00', 1, NULL),
            (3, 3, 8, '2024-02-11 12:00:00', 1, NULL),
            (4, 7, 8, '2024-04-11 15:30:00', 1, NULL);

            INSERT OR IGNORE INTO AssetRequests (AssetRequestID, AssetID, EmployeeID, RequestType, Description, Status, ReviewedBy, ReviewedAt, AdminComment, CreatedAt) VALUES
            (1, 3, 8, 'Repair', 'Screen flickering on HDMI port 2 after reboot', 'Pending', NULL, NULL, NULL, '2026-10-10 14:30:00');
            """;
        connection.Execute(seedAssetsSql);
    }
}
