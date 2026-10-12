-- ============================================================================
-- 06_Helpdesk.sql - Schema for Helpdesk Support Tickets & Comments
-- Idempotent, safe on existing databases
-- ============================================================================

USE HrmsDb;
GO

-- 1. Create Tickets table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Tickets' AND type = 'U')
BEGIN
    CREATE TABLE Tickets (
        TicketID INT IDENTITY(1,1) PRIMARY KEY,
        EmployeeID INT NOT NULL,
        Category NVARCHAR(50) NOT NULL,
        Subject NVARCHAR(200) NOT NULL,
        Description NVARCHAR(MAX) NOT NULL,
        Priority NVARCHAR(20) NOT NULL DEFAULT 'Medium',
        Status NVARCHAR(20) NOT NULL DEFAULT 'Open',
        AssignedTo INT NULL,
        FeedbackRating INT NULL,
        FeedbackComment NVARCHAR(500) NULL,
        CreatedAt DATETIME NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME NOT NULL DEFAULT GETUTCDATE(),
        ResolvedAt DATETIME NULL,
        CONSTRAINT FK_Ticket_Employee FOREIGN KEY (EmployeeID) REFERENCES Employees(EmployeeID) ON DELETE NO ACTION,
        CONSTRAINT FK_Ticket_AssignedTo FOREIGN KEY (AssignedTo) REFERENCES Employees(EmployeeID) ON DELETE NO ACTION,
        CONSTRAINT CHK_Ticket_Category CHECK (Category IN ('IT', 'HR', 'Payroll', 'Facilities', 'Admin', 'Other')),
        CONSTRAINT CHK_Ticket_Priority CHECK (Priority IN ('Low', 'Medium', 'High')),
        CONSTRAINT CHK_Ticket_Status CHECK (Status IN ('Open', 'InProgress', 'Resolved', 'Closed')),
        CONSTRAINT CHK_Ticket_FeedbackRating CHECK (FeedbackRating IS NULL OR (FeedbackRating >= 1 AND FeedbackRating <= 5))
    );

    CREATE NONCLUSTERED INDEX IX_Tickets_Employee ON Tickets (EmployeeID);
    CREATE NONCLUSTERED INDEX IX_Tickets_Status ON Tickets (Status);
    CREATE NONCLUSTERED INDEX IX_Tickets_Category ON Tickets (Category);
    CREATE NONCLUSTERED INDEX IX_Tickets_AssignedTo ON Tickets (AssignedTo);
END
GO

-- 2. Create TicketComments table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TicketComments' AND type = 'U')
BEGIN
    CREATE TABLE TicketComments (
        CommentID INT IDENTITY(1,1) PRIMARY KEY,
        TicketID INT NOT NULL,
        AuthorEmployeeID INT NOT NULL,
        Body NVARCHAR(MAX) NOT NULL,
        IsInternal BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_Comment_Ticket FOREIGN KEY (TicketID) REFERENCES Tickets(TicketID) ON DELETE NO ACTION,
        CONSTRAINT FK_Comment_Author FOREIGN KEY (AuthorEmployeeID) REFERENCES Employees(EmployeeID) ON DELETE NO ACTION
    );

    CREATE NONCLUSTERED INDEX IX_TicketComments_Ticket ON TicketComments (TicketID);
    CREATE NONCLUSTERED INDEX IX_TicketComments_Author ON TicketComments (AuthorEmployeeID);
END
GO
