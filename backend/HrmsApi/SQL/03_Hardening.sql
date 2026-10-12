-- ==========================================================
-- HRMS DATABASE HARDENING SCRIPT (v6)
-- Target: Microsoft SQL Server
-- Idempotent script for schema enhancements, constraints, and audit fields
-- ==========================================================

USE HrmsDb;
GO

-- 1. Employees Table Hardening
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Employees') AND name = 'DeactivatedAt')
BEGIN
    ALTER TABLE Employees ADD DeactivatedAt DATETIME NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Employees') AND name = 'ExitReason')
BEGIN
    ALTER TABLE Employees ADD ExitReason NVARCHAR(200) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Employees') AND name = 'CreatedAt')
BEGIN
    ALTER TABLE Employees ADD CreatedAt DATETIME NOT NULL CONSTRAINT DF_Employees_CreatedAt DEFAULT GETUTCDATE();
END
GO

-- Add CHECK constraint for positive salary
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Employees_Salary_Positive')
BEGIN
    ALTER TABLE Employees ADD CONSTRAINT CK_Employees_Salary_Positive CHECK (Salary > 0);
END
GO

-- Add Index on Status and Department
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Employees_Status_Department' AND object_id = OBJECT_ID('Employees'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Employees_Status_Department ON Employees(Status, Department);
END
GO

-- 2. LeaveRequests Table Hardening
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LeaveRequests') AND name = 'Days')
BEGIN
    ALTER TABLE LeaveRequests ADD Days INT NULL;

    -- Backfill existing rows with Monday-Friday business days using a culture-invariant base (1900-01-01 is Monday)
    EXEC(N'
        ;WITH DateRange AS (
            SELECT 
                LeaveID,
                StartDate,
                EndDate,
                StartDate AS CurrDate
            FROM LeaveRequests
            UNION ALL
            SELECT 
                d.LeaveID,
                d.StartDate,
                d.EndDate,
                DATEADD(day, 1, d.CurrDate)
            FROM DateRange d
            WHERE d.CurrDate < d.EndDate
        ),
        BusinessDaysCount AS (
            SELECT 
                LeaveID,
                COUNT(*) AS CalculatedDays
            FROM DateRange
            -- (DATEDIFF(day, ''1900-01-01'', CurrDate) % 7) gives: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
            WHERE (DATEDIFF(day, ''1900-01-01'', CurrDate) % 7) BETWEEN 0 AND 4
            GROUP BY LeaveID
        )
        UPDATE lr
        SET lr.Days = COALESCE(bd.CalculatedDays, 1)
        FROM LeaveRequests lr
        LEFT JOIN BusinessDaysCount bd ON lr.LeaveID = bd.LeaveID;
    ');

    -- Ensure any remaining NULLs receive a valid value before altering to NOT NULL
    UPDATE LeaveRequests SET Days = 1 WHERE Days IS NULL OR Days <= 0;

    ALTER TABLE LeaveRequests ALTER COLUMN Days INT NOT NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LeaveRequests') AND name = 'ManagerComment')
BEGIN
    ALTER TABLE LeaveRequests ADD ManagerComment NVARCHAR(500) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LeaveRequests') AND name = 'CreatedAt')
BEGIN
    ALTER TABLE LeaveRequests ADD CreatedAt DATETIME NOT NULL CONSTRAINT DF_LeaveRequests_CreatedAt DEFAULT GETUTCDATE();
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_LeaveRequests_DateRange')
BEGIN
    ALTER TABLE LeaveRequests ADD CONSTRAINT CK_LeaveRequests_DateRange CHECK (StartDate <= EndDate);
END
GO

-- 3. LeaveBalance Table Hardening (Persisted Computed Column & Range Checks)
-- If RemainingLeaves is a regular column, drop default and replace with computed column
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LeaveBalance') AND name = 'RemainingLeaves' AND is_computed = 0)
BEGIN
    -- Drop default constraint if present
    DECLARE @DefConstraintName NVARCHAR(200);
    SELECT @DefConstraintName = dc.name
    FROM sys.default_constraints dc
    JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
    WHERE dc.parent_object_id = OBJECT_ID('LeaveBalance') AND c.name = 'RemainingLeaves';

    IF @DefConstraintName IS NOT NULL
    BEGIN
        EXEC('ALTER TABLE LeaveBalance DROP CONSTRAINT ' + @DefConstraintName);
    END

    ALTER TABLE LeaveBalance DROP COLUMN RemainingLeaves;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LeaveBalance') AND name = 'RemainingLeaves')
BEGIN
    ALTER TABLE LeaveBalance ADD RemainingLeaves AS (TotalLeaves - UsedLeaves) PERSISTED;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_LeaveBalance_Used_Range')
BEGIN
    ALTER TABLE LeaveBalance ADD CONSTRAINT CK_LeaveBalance_Used_Range CHECK (UsedLeaves >= 0 AND UsedLeaves <= TotalLeaves);
END
GO

-- 4. Foreign Keys: Replace CASCADE with NO ACTION
-- FK_Employees_Users
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Employees_Users')
BEGIN
    ALTER TABLE Employees DROP CONSTRAINT FK_Employees_Users;
    ALTER TABLE Employees ADD CONSTRAINT FK_Employees_Users FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE NO ACTION;
END
GO

-- FK_LeaveBalance_Employees
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_LeaveBalance_Employees')
BEGIN
    ALTER TABLE LeaveBalance DROP CONSTRAINT FK_LeaveBalance_Employees;
    ALTER TABLE LeaveBalance ADD CONSTRAINT FK_LeaveBalance_Employees FOREIGN KEY (EmployeeID) REFERENCES Employees(EmployeeID) ON DELETE NO ACTION;
END
GO

-- FK_LeaveRequests_Employees
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_LeaveRequests_Employees')
BEGIN
    ALTER TABLE LeaveRequests DROP CONSTRAINT FK_LeaveRequests_Employees;
    ALTER TABLE LeaveRequests ADD CONSTRAINT FK_LeaveRequests_Employees FOREIGN KEY (EmployeeID) REFERENCES Employees(EmployeeID) ON DELETE NO ACTION;
END
GO

-- 5. Documents Table Hardening
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Documents') AND name = 'OriginalFileName')
BEGIN
    ALTER TABLE Documents ADD OriginalFileName NVARCHAR(255) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Documents') AND name = 'ContentType')
BEGIN
    ALTER TABLE Documents ADD ContentType NVARCHAR(100) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Documents') AND name = 'FileSizeBytes')
BEGIN
    ALTER TABLE Documents ADD FileSizeBytes BIGINT NULL;
END
GO
