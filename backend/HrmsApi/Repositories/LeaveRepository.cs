using Dapper;
using HrmsApi.Data;
using HrmsApi.DTOs;
using HrmsApi.Models;

namespace HrmsApi.Repositories;

public class LeaveRepository : ILeaveRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public LeaveRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IEnumerable<LeaveRequestResponseDto>> GetLeaveRequestsForEmployeeAsync(int employeeId)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT 
                lr.LeaveID,
                lr.EmployeeID,
                u.Name AS EmployeeName,
                e.Department,
                lr.LeaveType,
                lr.StartDate,
                lr.EndDate,
                DATEDIFF(day, lr.StartDate, lr.EndDate) + 1 AS TotalDays,
                lr.Reason,
                lr.Status,
                lr.ApprovedBy,
                apprU.Name AS ApproverName,
                lr.ApprovedAt
            FROM LeaveRequests lr
            INNER JOIN Employees e ON lr.EmployeeID = e.EmployeeID
            INNER JOIN Users u ON e.UserID = u.UserID
            LEFT JOIN Employees apprE ON lr.ApprovedBy = apprE.EmployeeID
            LEFT JOIN Users apprU ON apprE.UserID = apprU.UserID
            WHERE lr.EmployeeID = @EmployeeID
            ORDER BY lr.LeaveID DESC;
            """;

        return await connection.QueryAsync<LeaveRequestResponseDto>(sql, new { EmployeeID = employeeId });
    }

    public async Task<IEnumerable<LeaveRequestResponseDto>> GetLeaveRequestsForManagerAsync(int managerEmployeeId)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT 
                lr.LeaveID,
                lr.EmployeeID,
                u.Name AS EmployeeName,
                e.Department,
                lr.LeaveType,
                lr.StartDate,
                lr.EndDate,
                DATEDIFF(day, lr.StartDate, lr.EndDate) + 1 AS TotalDays,
                lr.Reason,
                lr.Status,
                lr.ApprovedBy,
                apprU.Name AS ApproverName,
                lr.ApprovedAt
            FROM LeaveRequests lr
            INNER JOIN Employees e ON lr.EmployeeID = e.EmployeeID
            INNER JOIN Users u ON e.UserID = u.UserID
            LEFT JOIN Employees apprE ON lr.ApprovedBy = apprE.EmployeeID
            LEFT JOIN Users apprU ON apprE.UserID = apprU.UserID
            WHERE e.ManagerID = @ManagerID
            ORDER BY lr.LeaveID DESC;
            """;

        return await connection.QueryAsync<LeaveRequestResponseDto>(sql, new { ManagerID = managerEmployeeId });
    }

    public async Task<IEnumerable<LeaveRequestResponseDto>> GetAllLeaveRequestsAdminAsync(string? status = null)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT 
                lr.LeaveID,
                lr.EmployeeID,
                u.Name AS EmployeeName,
                e.Department,
                lr.LeaveType,
                lr.StartDate,
                lr.EndDate,
                DATEDIFF(day, lr.StartDate, lr.EndDate) + 1 AS TotalDays,
                lr.Reason,
                lr.Status,
                lr.ApprovedBy,
                apprU.Name AS ApproverName,
                lr.ApprovedAt
            FROM LeaveRequests lr
            INNER JOIN Employees e ON lr.EmployeeID = e.EmployeeID
            INNER JOIN Users u ON e.UserID = u.UserID
            LEFT JOIN Employees apprE ON lr.ApprovedBy = apprE.EmployeeID
            LEFT JOIN Users apprU ON apprE.UserID = apprU.UserID
            WHERE (@Status IS NULL OR lr.Status = @Status)
            ORDER BY lr.LeaveID DESC;
            """;

        return await connection.QueryAsync<LeaveRequestResponseDto>(sql, new { Status = status });
    }

    public async Task<LeaveRequest?> GetLeaveRequestEntityByIdAsync(int leaveId)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT LeaveID, EmployeeID, LeaveType, StartDate, EndDate, Reason, Status, ApprovedBy, ApprovedAt
            FROM LeaveRequests
            WHERE LeaveID = @LeaveID;
            """;

        return await connection.QueryFirstOrDefaultAsync<LeaveRequest>(sql, new { LeaveID = leaveId });
    }

    public async Task<LeaveRequestResponseDto?> GetLeaveRequestByIdAsync(int leaveId)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT 
                lr.LeaveID,
                lr.EmployeeID,
                u.Name AS EmployeeName,
                e.Department,
                lr.LeaveType,
                lr.StartDate,
                lr.EndDate,
                DATEDIFF(day, lr.StartDate, lr.EndDate) + 1 AS TotalDays,
                lr.Reason,
                lr.Status,
                lr.ApprovedBy,
                apprU.Name AS ApproverName,
                lr.ApprovedAt
            FROM LeaveRequests lr
            INNER JOIN Employees e ON lr.EmployeeID = e.EmployeeID
            INNER JOIN Users u ON e.UserID = u.UserID
            LEFT JOIN Employees apprE ON lr.ApprovedBy = apprE.EmployeeID
            LEFT JOIN Users apprU ON apprE.UserID = apprU.UserID
            WHERE lr.LeaveID = @LeaveID;
            """;

        return await connection.QueryFirstOrDefaultAsync<LeaveRequestResponseDto>(sql, new { LeaveID = leaveId });
    }

    public async Task<LeaveBalanceDto?> GetLeaveBalanceAsync(int employeeId)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT 
                lb.LeaveBalanceID,
                lb.EmployeeID,
                u.Name AS EmployeeName,
                lb.TotalLeaves,
                lb.UsedLeaves,
                lb.RemainingLeaves
            FROM LeaveBalance lb
            INNER JOIN Employees e ON lb.EmployeeID = e.EmployeeID
            INNER JOIN Users u ON e.UserID = u.UserID
            WHERE lb.EmployeeID = @EmployeeID;
            """;

        return await connection.QueryFirstOrDefaultAsync<LeaveBalanceDto>(sql, new { EmployeeID = employeeId });
    }

    public async Task<LeaveRequestResponseDto> CreateLeaveRequestAsync(LeaveRequest request)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            INSERT INTO LeaveRequests (EmployeeID, LeaveType, StartDate, EndDate, Reason, Status, ApprovedBy, ApprovedAt)
            OUTPUT INSERTED.LeaveID
            VALUES (@EmployeeID, @LeaveType, @StartDate, @EndDate, @Reason, 'Pending', NULL, NULL);
            """;

        var id = await connection.ExecuteScalarAsync<int>(sql, new
        {
            request.EmployeeID,
            request.LeaveType,
            request.StartDate,
            request.EndDate,
            request.Reason
        });

        return (await GetLeaveRequestByIdAsync(id))!;
    }

    public async Task<bool> HasOverlappingLeaveAsync(int employeeId, DateTime startDate, DateTime endDate, int? excludeLeaveId = null)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT COUNT(1)
            FROM LeaveRequests
            WHERE EmployeeID = @EmployeeID
              AND Status IN ('Pending', 'Approved')
              AND (@ExcludeLeaveID IS NULL OR LeaveID != @ExcludeLeaveID)
              AND (StartDate <= @EndDate AND EndDate >= @StartDate);
            """;

        var count = await connection.ExecuteScalarAsync<int>(sql, new
        {
            EmployeeID = employeeId,
            StartDate = startDate,
            EndDate = endDate,
            ExcludeLeaveID = excludeLeaveId
        });

        return count > 0;
    }

    public async Task<bool> ApproveLeaveTransactionAsync(int leaveId, int employeeId, int managerEmployeeId, int daysToDeduct)
    {
        using var connection = _connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        try
        {
            // 1. Update LeaveRequest to Approved
            const string updateRequestSql = """
                UPDATE LeaveRequests
                SET Status = 'Approved',
                    ApprovedBy = @ApprovedBy,
                    ApprovedAt = GETDATE()
                WHERE LeaveID = @LeaveID AND Status = 'Pending';
                """;

            var updatedRows = await connection.ExecuteAsync(updateRequestSql, new
            {
                LeaveID = leaveId,
                ApprovedBy = managerEmployeeId
            }, transaction);

            if (updatedRows == 0)
            {
                transaction.Rollback();
                return false;
            }

            // 2. Atomically update LeaveBalance
            const string updateBalanceSql = """
                UPDATE LeaveBalance
                SET UsedLeaves = UsedLeaves + @Days,
                    RemainingLeaves = RemainingLeaves - @Days
                WHERE EmployeeID = @EmployeeID AND RemainingLeaves >= @Days;
                """;

            var balanceRows = await connection.ExecuteAsync(updateBalanceSql, new
            {
                EmployeeID = employeeId,
                Days = daysToDeduct
            }, transaction);

            if (balanceRows == 0)
            {
                // Balance was insufficient or employee balance record missing
                transaction.Rollback();
                return false;
            }

            transaction.Commit();
            return true;
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }

    public async Task<bool> RejectLeaveRequestAsync(int leaveId, int managerEmployeeId)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            UPDATE LeaveRequests
            SET Status = 'Rejected',
                ApprovedBy = @ApprovedBy,
                ApprovedAt = GETDATE()
            WHERE LeaveID = @LeaveID AND Status = 'Pending';
            """;

        var affected = await connection.ExecuteAsync(sql, new
        {
            LeaveID = leaveId,
            ApprovedBy = managerEmployeeId
        });

        return affected > 0;
    }
}
