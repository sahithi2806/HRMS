using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Dapper;
using HrmsApi.Data;
using HrmsApi.DTOs;
using HrmsApi.Models;

namespace HrmsApi.Repositories;

public class TicketRepository : ITicketRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public TicketRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IEnumerable<TicketDto>> GetTicketsAsync(int? employeeId, string? status = null, string? priority = null, string? category = null)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = """
            SELECT t.TicketID, t.EmployeeID, u.Name AS EmployeeName, e.Department,
                   t.Category, t.Subject, t.Description, t.Priority, t.Status,
                   t.AssignedTo, au.Name AS AssignedToName,
                   t.FeedbackRating, t.FeedbackComment,
                   t.CreatedAt, t.UpdatedAt, t.ResolvedAt,
                   (SELECT COUNT(1) FROM TicketComments tc WHERE tc.TicketID = t.TicketID) AS CommentsCount
            FROM Tickets t
            INNER JOIN Employees e ON t.EmployeeID = e.EmployeeID
            INNER JOIN Users u ON e.UserID = u.UserID
            LEFT JOIN Employees ae ON t.AssignedTo = ae.EmployeeID
            LEFT JOIN Users au ON ae.UserID = au.UserID
            WHERE (@EmployeeID IS NULL OR t.EmployeeID = @EmployeeID)
              AND (@Status IS NULL OR t.Status = @Status)
              AND (@Priority IS NULL OR t.Priority = @Priority)
              AND (@Category IS NULL OR t.Category = @Category)
            ORDER BY t.UpdatedAt DESC;
            """;
        return await connection.QueryAsync<TicketDto>(sql, new {
            EmployeeID = employeeId,
            Status = status,
            Priority = priority,
            Category = category
        });
    }

    public async Task<TicketDto?> GetTicketByIdAsync(int id)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT t.TicketID, t.EmployeeID, u.Name AS EmployeeName, e.Department,
                   t.Category, t.Subject, t.Description, t.Priority, t.Status,
                   t.AssignedTo, au.Name AS AssignedToName,
                   t.FeedbackRating, t.FeedbackComment,
                   t.CreatedAt, t.UpdatedAt, t.ResolvedAt,
                   (SELECT COUNT(1) FROM TicketComments tc WHERE tc.TicketID = t.TicketID) AS CommentsCount
            FROM Tickets t
            INNER JOIN Employees e ON t.EmployeeID = e.EmployeeID
            INNER JOIN Users u ON e.UserID = u.UserID
            LEFT JOIN Employees ae ON t.AssignedTo = ae.EmployeeID
            LEFT JOIN Users au ON ae.UserID = au.UserID
            WHERE t.TicketID = @TicketID;
            """;
        return await connection.QuerySingleOrDefaultAsync<TicketDto>(sql, new { TicketID = id });
    }

    public async Task<IEnumerable<TicketCommentDto>> GetCommentsByTicketIdAsync(int ticketId, bool includeInternal)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = """
            SELECT tc.CommentID, tc.TicketID, tc.AuthorEmployeeID,
                   u.Name AS AuthorName, u.Role AS AuthorRole,
                   tc.Body, tc.IsInternal, tc.CreatedAt
            FROM TicketComments tc
            INNER JOIN Employees e ON tc.AuthorEmployeeID = e.EmployeeID
            INNER JOIN Users u ON e.UserID = u.UserID
            WHERE tc.TicketID = @TicketID
            """ + (includeInternal ? "" : " AND tc.IsInternal = 0") + """
            ORDER BY tc.CreatedAt ASC;
            """;
        return await connection.QueryAsync<TicketCommentDto>(sql, new { TicketID = ticketId });
    }

    public async Task<Ticket> CreateTicketAsync(Ticket ticket)
    {
        using var connection = _connectionFactory.CreateConnection();
        if (_connectionFactory.Provider == "Sqlite")
        {
            const string sql = """
                INSERT INTO Tickets (EmployeeID, Category, Subject, Description, Priority, Status, AssignedTo, CreatedAt, UpdatedAt)
                VALUES (@EmployeeID, @Category, @Subject, @Description, @Priority, 'Open', @AssignedTo, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
                SELECT last_insert_rowid();
                """;
            ticket.TicketID = await connection.ExecuteScalarAsync<int>(sql, ticket);
        }
        else
        {
            const string sql = """
                INSERT INTO Tickets (EmployeeID, Category, Subject, Description, Priority, Status, AssignedTo, CreatedAt, UpdatedAt)
                VALUES (@EmployeeID, @Category, @Subject, @Description, @Priority, 'Open', @AssignedTo, GETUTCDATE(), GETUTCDATE());
                SELECT CAST(SCOPE_IDENTITY() AS INT);
                """;
            ticket.TicketID = await connection.ExecuteScalarAsync<int>(sql, ticket);
        }
        return ticket;
    }

    public async Task<TicketComment> AddCommentAsync(TicketComment comment)
    {
        using var connection = _connectionFactory.CreateConnection();
        if (_connectionFactory.Provider == "Sqlite")
        {
            const string insertSql = """
                INSERT INTO TicketComments (TicketID, AuthorEmployeeID, Body, IsInternal, CreatedAt)
                VALUES (@TicketID, @AuthorEmployeeID, @Body, @IsInternal, CURRENT_TIMESTAMP);
                SELECT last_insert_rowid();
                """;
            comment.CommentID = await connection.ExecuteScalarAsync<int>(insertSql, comment);

            const string updateTicketSql = "UPDATE Tickets SET UpdatedAt = CURRENT_TIMESTAMP WHERE TicketID = @TicketID;";
            await connection.ExecuteAsync(updateTicketSql, new { comment.TicketID });
        }
        else
        {
            const string insertSql = """
                INSERT INTO TicketComments (TicketID, AuthorEmployeeID, Body, IsInternal, CreatedAt)
                VALUES (@TicketID, @AuthorEmployeeID, @Body, @IsInternal, GETUTCDATE());
                SELECT CAST(SCOPE_IDENTITY() AS INT);
                """;
            comment.CommentID = await connection.ExecuteScalarAsync<int>(insertSql, comment);

            const string updateTicketSql = "UPDATE Tickets SET UpdatedAt = GETUTCDATE() WHERE TicketID = @TicketID;";
            await connection.ExecuteAsync(updateTicketSql, new { comment.TicketID });
        }
        return comment;
    }

    public async Task<bool> UpdateTicketAsync(int ticketId, string? status, int? assignedTo, string? priority, DateTime? resolvedAt)
    {
        using var connection = _connectionFactory.CreateConnection();
        string updateTime = _connectionFactory.Provider == "Sqlite" ? "CURRENT_TIMESTAMP" : "GETUTCDATE()";

        var sql = $"""
            UPDATE Tickets
            SET Status = COALESCE(@Status, Status),
                AssignedTo = COALESCE(@AssignedTo, AssignedTo),
                Priority = COALESCE(@Priority, Priority),
                ResolvedAt = CASE WHEN @ResolvedAt IS NOT NULL THEN @ResolvedAt ELSE ResolvedAt END,
                UpdatedAt = {updateTime}
            WHERE TicketID = @TicketID;
            """;
        var rows = await connection.ExecuteAsync(sql, new {
            TicketID = ticketId,
            Status = status,
            AssignedTo = assignedTo,
            Priority = priority,
            ResolvedAt = resolvedAt
        });
        return rows > 0;
    }

    public async Task<bool> SubmitFeedbackAsync(int ticketId, int rating, string? comment)
    {
        using var connection = _connectionFactory.CreateConnection();
        string updateTime = _connectionFactory.Provider == "Sqlite" ? "CURRENT_TIMESTAMP" : "GETUTCDATE()";

        var sql = $"""
            UPDATE Tickets
            SET FeedbackRating = @Rating,
                FeedbackComment = @Comment,
                UpdatedAt = {updateTime}
            WHERE TicketID = @TicketID;
            """;
        var rows = await connection.ExecuteAsync(sql, new { TicketID = ticketId, Rating = rating, Comment = comment });
        return rows > 0;
    }
}
