-- ==========================================================
-- HRMS DATABASE CREATION & SCHEMA SCRIPT
-- Target: Microsoft SQL Server
-- Access Layer: Dapper ONLY
-- ==========================================================

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'HrmsDb')
BEGIN
    CREATE DATABASE HrmsDb;
END
GO

USE HrmsDb;
GO

-- 1. Users Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
BEGIN
    CREATE TABLE Users (
        UserID INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        Email NVARCHAR(150) NOT NULL CONSTRAINT UQ_Users_Email UNIQUE,
        PasswordHash NVARCHAR(255) NOT NULL,
        Role NVARCHAR(20) NOT NULL CONSTRAINT CK_Users_Role CHECK (Role IN ('Admin', 'Manager', 'Employee')),
        CreatedAt DATETIME NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT GETDATE()
    );
END
GO

-- 2. Employees Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Employees')
BEGIN
    CREATE TABLE Employees (
        EmployeeID INT IDENTITY(1,1) PRIMARY KEY,
        UserID INT NOT NULL CONSTRAINT UQ_Employees_UserID UNIQUE,
        Department NVARCHAR(100) NOT NULL,
        Position NVARCHAR(100) NOT NULL,
        JoiningDate DATE NOT NULL,
        Salary DECIMAL(10,2) NOT NULL,
        Status NVARCHAR(20) NOT NULL CONSTRAINT DF_Employees_Status DEFAULT 'Active' CONSTRAINT CK_Employees_Status CHECK (Status IN ('Active', 'Inactive')),
        ManagerID INT NULL,
        CONSTRAINT FK_Employees_Users FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
        CONSTRAINT FK_Employees_Manager FOREIGN KEY (ManagerID) REFERENCES Employees(EmployeeID)
    );
END
GO

-- 3. Documents Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Documents')
BEGIN
    CREATE TABLE Documents (
        DocumentID INT IDENTITY(1,1) PRIMARY KEY,
        Title NVARCHAR(200) NOT NULL,
        Category NVARCHAR(50) NOT NULL,
        FilePath NVARCHAR(500) NOT NULL,
        UploadedBy INT NOT NULL,
        UploadedAt DATETIME NOT NULL CONSTRAINT DF_Documents_UploadedAt DEFAULT GETDATE(),
        IsActive BIT NOT NULL CONSTRAINT DF_Documents_IsActive DEFAULT 1,
        CONSTRAINT FK_Documents_Users FOREIGN KEY (UploadedBy) REFERENCES Users(UserID)
    );
END
GO

-- 4. LeaveBalance Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LeaveBalance')
BEGIN
    CREATE TABLE LeaveBalance (
        LeaveBalanceID INT IDENTITY(1,1) PRIMARY KEY,
        EmployeeID INT NOT NULL CONSTRAINT UQ_LeaveBalance_EmployeeID UNIQUE,
        TotalLeaves INT NOT NULL CONSTRAINT DF_LeaveBalance_Total DEFAULT 20,
        UsedLeaves INT NOT NULL CONSTRAINT DF_LeaveBalance_Used DEFAULT 0,
        RemainingLeaves INT NOT NULL CONSTRAINT DF_LeaveBalance_Remaining DEFAULT 20,
        CONSTRAINT FK_LeaveBalance_Employees FOREIGN KEY (EmployeeID) REFERENCES Employees(EmployeeID) ON DELETE CASCADE
    );
END
GO

-- 5. LeaveRequests Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LeaveRequests')
BEGIN
    CREATE TABLE LeaveRequests (
        LeaveID INT IDENTITY(1,1) PRIMARY KEY,
        EmployeeID INT NOT NULL,
        LeaveType NVARCHAR(30) NOT NULL CONSTRAINT CK_LeaveRequests_Type CHECK (LeaveType IN ('Casual', 'Sick', 'Earned')),
        StartDate DATE NOT NULL,
        EndDate DATE NOT NULL,
        Reason NVARCHAR(500) NOT NULL,
        Status NVARCHAR(20) NOT NULL CONSTRAINT DF_LeaveRequests_Status DEFAULT 'Pending' CONSTRAINT CK_LeaveRequests_Status CHECK (Status IN ('Pending', 'Approved', 'Rejected')),
        ApprovedBy INT NULL,
        ApprovedAt DATETIME NULL,
        CONSTRAINT FK_LeaveRequests_Employees FOREIGN KEY (EmployeeID) REFERENCES Employees(EmployeeID) ON DELETE CASCADE,
        CONSTRAINT FK_LeaveRequests_ApprovedBy FOREIGN KEY (ApprovedBy) REFERENCES Employees(EmployeeID)
    );
END
GO

-- Indexes for performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Employees_ManagerID')
BEGIN
    CREATE NONCLUSTERED INDEX IX_Employees_ManagerID ON Employees(ManagerID);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Documents_IsActive_Category')
BEGIN
    CREATE NONCLUSTERED INDEX IX_Documents_IsActive_Category ON Documents(IsActive, Category);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_LeaveRequests_Employee_Status')
BEGIN
    CREATE NONCLUSTERED INDEX IX_LeaveRequests_Employee_Status ON LeaveRequests(EmployeeID, Status);
END
GO
