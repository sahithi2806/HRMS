using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Dapper;
using HrmsApi.Data;
using HrmsApi.DTOs;
using HrmsApi.Models;

namespace HrmsApi.Repositories;

public class AttendanceRegularizationRepository : IAttendanceRegularizationRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public AttendanceRegularizationRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<AttendanceRegularization?> GetByIdAsync(int regularizationId)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT RegularizationID, EmployeeID, WorkDate, RequestedCheckIn, RequestedCheckOut,
                   Reason, Status, ApprovedBy, ApprovedAt, ManagerComment, CreatedAt
            FROM AttendanceRegularizations
            WHERE RegularizationID = @RegularizationID;
            """;
        return await connection.QuerySingleOrDefaultAsync<AttendanceRegularization>(sql, new { RegularizationID = regularizationId });
    }

    public async Task<IEnumerable<RegularizationDto>> GetByEmployeeAsync(int employeeId)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT ar.RegularizationID, ar.EmployeeID, u.Name AS EmployeeName, e.Department,
                   ar.WorkDate, ar.RequestedCheckIn, ar.RequestedCheckOut, ar.Reason,
                   ar.Status, ar.ApprovedBy, au.Name AS ApproverName, ar.ApprovedAt,
                   ar.ManagerComment, ar.CreatedAt
            FROM AttendanceRegularizations ar
            INNER JOIN Employees e ON ar.EmployeeID = e.EmployeeID
            INNER JOIN Users u ON e.UserID = u.UserID
            LEFT JOIN Employees ae ON ar.ApprovedBy = ae.EmployeeID
            LEFT JOIN Users au ON ae.UserID = au.UserID
            WHERE ar.EmployeeID = @EmployeeID
            ORDER BY ar.CreatedAt DESC;
            """;
        return await connection.QueryAsync<RegularizationDto>(sql, new { EmployeeID = employeeId });
    }

    public async Task<IEnumerable<RegularizationDto>> GetPendingForManagerAsync(int managerId)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT ar.RegularizationID, ar.EmployeeID, u.Name AS EmployeeName, e.Department,
                   ar.WorkDate, ar.RequestedCheckIn, ar.RequestedCheckOut, ar.Reason,
                   ar.Status, ar.ApprovedBy, NULL AS ApproverName, ar.ApprovedAt,
                   ar.ManagerComment, ar.CreatedAt
            FROM AttendanceRegularizations ar
            INNER JOIN Employees e ON ar.EmployeeID = e.EmployeeID
            INNER JOIN Users u ON e.UserID = u.UserID
            WHERE ar.Status = 'Pending' AND e.ManagerID = @ManagerID
            ORDER BY ar.CreatedAt DESC;
            """;
        return await connection.QueryAsync<RegularizationDto>(sql, new { ManagerID = managerId });
    }

    public async Task<IEnumerable<RegularizationDto>> GetAllAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT ar.RegularizationID, ar.EmployeeID, u.Name AS EmployeeName, e.Department,
                   ar.WorkDate, ar.RequestedCheckIn, ar.RequestedCheckOut, ar.Reason,
                   ar.Status, ar.ApprovedBy, au.Name AS ApproverName, ar.ApprovedAt,
                   ar.ManagerComment, ar.CreatedAt
            FROM AttendanceRegularizations ar
            INNER JOIN Employees e ON ar.EmployeeID = e.EmployeeID
            INNER JOIN Users u ON e.UserID = u.UserID
            LEFT JOIN Employees ae ON ar.ApprovedBy = ae.EmployeeID
            LEFT JOIN Users au ON ae.UserID = au.UserID
            ORDER BY ar.CreatedAt DESC;
            """;
        return await connection.QueryAsync<RegularizationDto>(sql);
    }

    public async Task<int> CreateAsync(AttendanceRegularization reg)
    {
        using var connection = _connectionFactory.CreateConnection();
        if (_connectionFactory.Provider == "Sqlite")
        {
            const string sql = """
                INSERT INTO AttendanceRegularizations 
                (EmployeeID, WorkDate, RequestedCheckIn, RequestedCheckOut, Reason, Status, CreatedAt)
                VALUES (@EmployeeID, @WorkDate, @RequestedCheckIn, @RequestedCheckOut, @Reason, 'Pending', CURRENT_TIMESTAMP);
                SELECT last_insert_rowid();
                """;
            return await connection.ExecuteScalarAsync<int>(sql, new
            {
                reg.EmployeeID,
                reg.WorkDate,
                RequestedCheckIn = reg.RequestedCheckIn.ToString("yyyy-MM-dd HH:mm:ss"),
                RequestedCheckOut = reg.RequestedCheckOut.ToString("yyyy-MM-dd HH:mm:ss"),
                reg.Reason
            });
        }
        else
        {
            const string sql = """
                INSERT INTO AttendanceRegularizations 
                (EmployeeID, WorkDate, RequestedCheckIn, RequestedCheckOut, Reason, Status, CreatedAt)
                VALUES (@EmployeeID, @WorkDate, @RequestedCheckIn, @RequestedCheckOut, @Reason, 'Pending', GETUTCDATE());
                SELECT CAST(SCOPE_IDENTITY() AS INT);
                """;
            return await connection.ExecuteScalarAsync<int>(sql, reg);
        }
    }

    public async Task<bool> UpdateStatusAsync(int regularizationId, string status, int approverId, string? comment)
    {
        using var connection = _connectionFactory.CreateConnection();
        string approvedAt = _connectionFactory.Provider == "Sqlite" ? DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss") : DateTime.UtcNow.ToString("o");

        const string sql = """
            UPDATE AttendanceRegularizations
            SET Status = @Status,
                ApprovedBy = @ApprovedBy,
                ApprovedAt = @ApprovedAt,
                ManagerComment = @ManagerComment
            WHERE RegularizationID = @RegularizationID AND Status = 'Pending';
            """;

        var rows = await connection.ExecuteAsync(sql, new
        {
            RegularizationID = regularizationId,
            Status = status,
            ApprovedBy = approverId,
            ApprovedAt = approvedAt,
            ManagerComment = comment
        });

        return rows > 0;
    }

    public async Task<bool> CancelAsync(int regularizationId, int employeeId)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            UPDATE AttendanceRegularizations
            SET Status = 'Cancelled'
            WHERE RegularizationID = @RegularizationID 
              AND EmployeeID = @EmployeeID 
              AND Status = 'Pending';
            """;
        var rows = await connection.ExecuteAsync(sql, new
        {
            RegularizationID = regularizationId,
            EmployeeID = employeeId
        });
        return rows > 0;
    }
}
