-- ============================================================================
-- 05_Assets.sql - Schema for Asset Management & Lifecycle
-- Idempotent, safe on existing databases
-- ============================================================================

USE HrmsDb;
GO

-- 1. Create Assets table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Assets' AND type = 'U')
BEGIN
    CREATE TABLE Assets (
        AssetID INT IDENTITY(1,1) PRIMARY KEY,
        AssetTag NVARCHAR(50) NOT NULL UNIQUE,
        Name NVARCHAR(100) NOT NULL,
        Category NVARCHAR(50) NOT NULL,
        SerialNumber NVARCHAR(100) NULL,
        PurchaseDate DATE NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'Available',
        CreatedAt DATETIME NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT CHK_Asset_Status CHECK (Status IN ('Available', 'Assigned', 'UnderRepair', 'Retired')),
        CONSTRAINT CHK_Asset_Category CHECK (Category IN ('Laptop', 'Mobile', 'Monitor', 'Accessory', 'Other'))
    );

    CREATE NONCLUSTERED INDEX IX_Assets_Status ON Assets (Status);
    CREATE NONCLUSTERED INDEX IX_Assets_Category ON Assets (Category);
END
GO

-- 2. Create AssetAssignments table with Filtered Unique Index
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AssetAssignments' AND type = 'U')
BEGIN
    CREATE TABLE AssetAssignments (
        AssignmentID INT IDENTITY(1,1) PRIMARY KEY,
        AssetID INT NOT NULL,
        EmployeeID INT NOT NULL,
        AssignedAt DATETIME NOT NULL DEFAULT GETUTCDATE(),
        AssignedBy INT NOT NULL,
        ReturnedAt DATETIME NULL,
        CONSTRAINT FK_AssetAssign_Asset FOREIGN KEY (AssetID) REFERENCES Assets(AssetID) ON DELETE NO ACTION,
        CONSTRAINT FK_AssetAssign_Employee FOREIGN KEY (EmployeeID) REFERENCES Employees(EmployeeID) ON DELETE NO ACTION,
        CONSTRAINT FK_AssetAssign_AssignedBy FOREIGN KEY (AssignedBy) REFERENCES Employees(EmployeeID) ON DELETE NO ACTION
    );

    -- Filtered UNIQUE index: Enforces exactly ONE open assignment per asset
    CREATE UNIQUE NONCLUSTERED INDEX UQ_Asset_OpenAssignment 
    ON AssetAssignments (AssetID) 
    WHERE ReturnedAt IS NULL;

    CREATE NONCLUSTERED INDEX IX_AssetAssign_Employee ON AssetAssignments (EmployeeID);
END
GO

-- 3. Create AssetRequests table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AssetRequests' AND type = 'U')
BEGIN
    CREATE TABLE AssetRequests (
        AssetRequestID INT IDENTITY(1,1) PRIMARY KEY,
        AssetID INT NOT NULL,
        EmployeeID INT NOT NULL,
        RequestType NVARCHAR(20) NOT NULL, -- 'Repair', 'Return'
        Description NVARCHAR(500) NOT NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'Pending',
        ReviewedBy INT NULL,
        ReviewedAt DATETIME NULL,
        AdminComment NVARCHAR(500) NULL,
        CreatedAt DATETIME NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_AssetReq_Asset FOREIGN KEY (AssetID) REFERENCES Assets(AssetID) ON DELETE NO ACTION,
        CONSTRAINT FK_AssetReq_Employee FOREIGN KEY (EmployeeID) REFERENCES Employees(EmployeeID) ON DELETE NO ACTION,
        CONSTRAINT FK_AssetReq_ReviewedBy FOREIGN KEY (ReviewedBy) REFERENCES Employees(EmployeeID) ON DELETE NO ACTION,
        CONSTRAINT CHK_AssetReq_Type CHECK (RequestType IN ('Repair', 'Return')),
        CONSTRAINT CHK_AssetReq_Status CHECK (Status IN ('Pending', 'Approved', 'Rejected', 'Cancelled'))
    );

    CREATE NONCLUSTERED INDEX IX_AssetReq_Employee ON AssetRequests (EmployeeID);
    CREATE NONCLUSTERED INDEX IX_AssetReq_Status ON AssetRequests (Status);
END
GO
