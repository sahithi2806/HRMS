

-- ==========================================================
-- HRMS SEED DATA SCRIPT
-- Target: Microsoft SQL Server
-- Default Accounts:
--   1. Admin:    admin@hrms.com    / Admin@123
--   2. Manager:  manager@hrms.com  / Manager@123
--   3. Employee: employee@hrms.com / Employee@123
-- BCrypt WorkFactor: 11
-- ==========================================================

USE HrmsDb;
GO

-- 1. Seed Users (BCrypt hashes for Admin@123, Manager@123, Employee@123)
-- Hash for Admin@123:    $2a$11$/N1c9972tXpqxLh74x5kEe7bWJndRfxfrOdIlBu9hhqay2egmt/bO
-- Hash for Manager@123:  $2a$11$JKcdrN9QmoUVCDYlHMBGKOhOwrs8pwyHeaxnSFFkXDk5O3vnMbZ2C
-- Hash for Employee@123: $2a$11$LF3glo5/GAPSDmwh4F79g.YAlWLNfVPSQjPQTozbIMlOwmsTZakNK

IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'admin@hrms.com')
BEGIN
    INSERT INTO Users (Name, Email, PasswordHash, Role, CreatedAt)
    VALUES ('HR Administrator', 'admin@hrms.com', '$2a$11$/N1c9972tXpqxLh74x5kEe7bWJndRfxfrOdIlBu9hhqay2egmt/bO', 'Admin', GETDATE());
END
ELSE
BEGIN
    UPDATE Users SET PasswordHash = '$2a$11$/N1c9972tXpqxLh74x5kEe7bWJndRfxfrOdIlBu9hhqay2egmt/bO' WHERE Email = 'admin@hrms.com';
END

IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'manager@hrms.com')
BEGIN
    INSERT INTO Users (Name, Email, PasswordHash, Role, CreatedAt)
    VALUES ('Alex Mercer (Manager)', 'manager@hrms.com', '$2a$11$JKcdrN9QmoUVCDYlHMBGKOhOwrs8pwyHeaxnSFFkXDk5O3vnMbZ2C', 'Manager', GETDATE());
END
ELSE
BEGIN
    UPDATE Users SET PasswordHash = '$2a$11$JKcdrN9QmoUVCDYlHMBGKOhOwrs8pwyHeaxnSFFkXDk5O3vnMbZ2C' WHERE Email = 'manager@hrms.com';
END

IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'employee@hrms.com')
BEGIN
    INSERT INTO Users (Name, Email, PasswordHash, Role, CreatedAt)
    VALUES ('Sarah Connor (Engineer)', 'employee@hrms.com', '$2a$11$LF3glo5/GAPSDmwh4F79g.YAlWLNfVPSQjPQTozbIMlOwmsTZakNK', 'Employee', GETDATE());
END
ELSE
BEGIN
    UPDATE Users SET PasswordHash = '$2a$11$LF3glo5/GAPSDmwh4F79g.YAlWLNfVPSQjPQTozbIMlOwmsTZakNK' WHERE Email = 'employee@hrms.com';
END
GO

-- 2. Seed Employees
DECLARE @AdminUserId INT = (SELECT UserID FROM Users WHERE Email = 'admin@hrms.com');
DECLARE @ManagerUserId INT = (SELECT UserID FROM Users WHERE Email = 'manager@hrms.com');
DECLARE @EmployeeUserId INT = (SELECT UserID FROM Users WHERE Email = 'employee@hrms.com');

-- Admin Employee Record
IF NOT EXISTS (SELECT 1 FROM Employees WHERE UserID = @AdminUserId)
BEGIN
    INSERT INTO Employees (UserID, Department, Position, JoiningDate, Salary, Status, ManagerID)
    VALUES (@AdminUserId, 'Human Resources', 'HR Director', '2023-01-15', 95000.00, 'Active', NULL);
END

-- Manager Employee Record
IF NOT EXISTS (SELECT 1 FROM Employees WHERE UserID = @ManagerUserId)
BEGIN
    INSERT INTO Employees (UserID, Department, Position, JoiningDate, Salary, Status, ManagerID)
    VALUES (@ManagerUserId, 'Engineering', 'Engineering Lead', '2023-03-01', 110000.00, 'Active', NULL);
END

DECLARE @ManagerEmpId INT = (SELECT EmployeeID FROM Employees WHERE UserID = @ManagerUserId);

-- Employee Record reporting to Manager
IF NOT EXISTS (SELECT 1 FROM Employees WHERE UserID = @EmployeeUserId)
BEGIN
    INSERT INTO Employees (UserID, Department, Position, JoiningDate, Salary, Status, ManagerID)
    VALUES (@EmployeeUserId, 'Engineering', 'Software Developer', '2024-02-10', 75000.00, 'Active', @ManagerEmpId);
END
GO

-- 3. Seed LeaveBalances
DECLARE @AdminEmpId INT = (SELECT E.EmployeeID FROM Employees E JOIN Users U ON E.UserID = U.UserID WHERE U.Email = 'admin@hrms.com');
DECLARE @MgrEmpId INT = (SELECT E.EmployeeID FROM Employees E JOIN Users U ON E.UserID = U.UserID WHERE U.Email = 'manager@hrms.com');
DECLARE @DevEmpId INT = (SELECT E.EmployeeID FROM Employees E JOIN Users U ON E.UserID = U.UserID WHERE U.Email = 'employee@hrms.com');

IF NOT EXISTS (SELECT 1 FROM LeaveBalance WHERE EmployeeID = @AdminEmpId)
BEGIN
    INSERT INTO LeaveBalance (EmployeeID, TotalLeaves, UsedLeaves, RemainingLeaves)
    VALUES (@AdminEmpId, 24, 0, 24);
END

IF NOT EXISTS (SELECT 1 FROM LeaveBalance WHERE EmployeeID = @MgrEmpId)
BEGIN
    INSERT INTO LeaveBalance (EmployeeID, TotalLeaves, UsedLeaves, RemainingLeaves)
    VALUES (@MgrEmpId, 24, 2, 22);
END

IF NOT EXISTS (SELECT 1 FROM LeaveBalance WHERE EmployeeID = @DevEmpId)
BEGIN
    INSERT INTO LeaveBalance (EmployeeID, TotalLeaves, UsedLeaves, RemainingLeaves)
    VALUES (@DevEmpId, 20, 3, 17);
END
GO
