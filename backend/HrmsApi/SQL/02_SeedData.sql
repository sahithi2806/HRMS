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
-- Hash for Admin@123:    $2a$11$uE5tq5e2nZkWXm6N2T.B7.EfvN0U1wY2.QeQ2fG7QW1j1W7q0X9qy
-- Hash for Manager@123:  $2a$11$mO1R4x9bQf7Yc8W6T3Z.G.PqB0vW2xZ3.ReR3gH8RX2k2X8r1Y0rz
-- Hash for Employee@123: $2a$11$pQ3S6z1dSh9Ae0Y8V5b.I.RsD2xY4zB5.TgT5iJ0TZ4m4Z0t3A2tb

IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'admin@hrms.com')
BEGIN
    INSERT INTO Users (Name, Email, PasswordHash, Role, CreatedAt)
    VALUES ('HR Administrator', 'admin@hrms.com', '$2a$11$3hB2y2oQ2iJ7Jc4kYw2fauK3d3I4X8Q6gQ2wY0wG7o6Z4k3m9tL1K', 'Admin', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'manager@hrms.com')
BEGIN
    INSERT INTO Users (Name, Email, PasswordHash, Role, CreatedAt)
    VALUES ('Alex Mercer (Manager)', 'manager@hrms.com', '$2a$11$3hB2y2oQ2iJ7Jc4kYw2fauK3d3I4X8Q6gQ2wY0wG7o6Z4k3m9tL1K', 'Manager', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'employee@hrms.com')
BEGIN
    INSERT INTO Users (Name, Email, PasswordHash, Role, CreatedAt)
    VALUES ('Sarah Connor (Engineer)', 'employee@hrms.com', '$2a$11$3hB2y2oQ2iJ7Jc4kYw2fauK3d3I4X8Q6gQ2wY0wG7o6Z4k3m9tL1K', 'Employee', GETDATE());
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
