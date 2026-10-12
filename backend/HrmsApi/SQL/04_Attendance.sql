-- ============================================================================
-- 04_Attendance.sql - Schema for Attendance & Regularization
-- Idempotent, safe on existing databases
-- ============================================================================

USE HrmsDb;
GO

-- 1. Create Attendance table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Attendance' AND type = 'U')
BEGIN
    CREATE TABLE Attendance (
        AttendanceID INT IDENTITY(1,1) PRIMARY KEY,
        EmployeeID INT NOT NULL,
        WorkDate DATE NOT NULL,
        CheckInAt DATETIME NOT NULL,
        CheckOutAt DATETIME NULL,
        IsLate BIT NOT NULL DEFAULT 0,
        Status NVARCHAR(20) NULL, -- 'Present', 'HalfDay', 'Absent'
        Source NVARCHAR(20) NOT NULL DEFAULT 'Self', -- 'Self', 'Regularized'
        CreatedAt DATETIME NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT UQ_Attendance_Employee_WorkDate UNIQUE (EmployeeID, WorkDate),
        CONSTRAINT FK_Attendance_Employee FOREIGN KEY (EmployeeID) REFERENCES Employees(EmployeeID) ON DELETE NO ACTION,
        CONSTRAINT CHK_Attendance_Status CHECK (Status IS NULL OR Status IN ('Present', 'HalfDay', 'Absent')),
        CONSTRAINT CHK_Attendance_Source CHECK (Source IN ('Self', 'Regularized'))
    );

    CREATE NONCLUSTERED INDEX IX_Attendance_Employee_WorkDate ON Attendance (EmployeeID, WorkDate);
    CREATE NONCLUSTERED INDEX IX_Attendance_WorkDate ON Attendance (WorkDate);
END
GO

-- 2. Create AttendanceRegularizations table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AttendanceRegularizations' AND type = 'U')
BEGIN
    CREATE TABLE AttendanceRegularizations (
        RegularizationID INT IDENTITY(1,1) PRIMARY KEY,
        EmployeeID INT NOT NULL,
        WorkDate DATE NOT NULL,
        RequestedCheckIn DATETIME NOT NULL,
        RequestedCheckOut DATETIME NOT NULL,
        Reason NVARCHAR(500) NOT NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'Pending',
        ApprovedBy INT NULL,
        ApprovedAt DATETIME NULL,
        ManagerComment NVARCHAR(500) NULL,
        CreatedAt DATETIME NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_Regularizations_Employee FOREIGN KEY (EmployeeID) REFERENCES Employees(EmployeeID) ON DELETE NO ACTION,
        CONSTRAINT FK_Regularizations_ApprovedBy FOREIGN KEY (ApprovedBy) REFERENCES Employees(EmployeeID) ON DELETE NO ACTION,
        CONSTRAINT CHK_Regularization_Status CHECK (Status IN ('Pending', 'Approved', 'Rejected', 'Cancelled'))
    );

    CREATE NONCLUSTERED INDEX IX_AttendanceReg_Employee ON AttendanceRegularizations (EmployeeID);
    CREATE NONCLUSTERED INDEX IX_AttendanceReg_Status ON AttendanceRegularizations (Status);
END
GO
