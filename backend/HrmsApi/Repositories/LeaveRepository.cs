using System.Data;
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

    private string TotalDaysSql => _connectionFactory.Provider == "Sqlite"
        ? "CAST((julianday(lr.EndDate) - julianday(lr.StartDate)) AS INTEGER) + 1"
        : "DATEDIFF(day, lr.StartDate, lr.EndDate) + 1";

    private string CurrentTimestampSql => _connectionFactory.Provider == "Sqlite"
        ? "datetime('now')"
        : "GETDATE()";

    public async Task<IEnumerable<LeaveRequestResponseDto>> GetLeaveRequestsForEmployeeAsync(int employeeId, string? status = null)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = $"""
            SELECT 
                lr.LeaveID,
                lr.EmployeeID,
                u.Name AS EmployeeName,
                e.Department,
                lr.LeaveType,
                lr.StartDate,
                lr.EndDate,
                COALESCE(lr.Days, {TotalDaysSql}) AS Days,
                lr.Reason,
                lr.Status,
                lr.ApprovedBy,
                apprU.Name AS ApproverName,
                lr.ApprovedAt,
                lr.ManagerComment,
                lr.CreatedAt
            FROM LeaveRequests lr
            INNER JOIN Employees e ON lr.EmployeeID = e.EmployeeID
            INNER JOIN Users u ON e.UserID = u.UserID
            LEFT JOIN Employees apprE ON lr.ApprovedBy = apprE.EmployeeID
            LEFT JOIN Users apprU ON apprE.UserID = apprU.UserID
            WHERE lr.EmployeeID = @EmployeeID
              AND (@Status IS NULL OR lr.Status = @Status)
            ORDER BY lr.LeaveID DESC;
            """;

        return await connection.QueryAsync<LeaveRequestResponseDto>(sql, new { EmployeeID = employeeId, Status = status });
    }

    public async Task<IEnumerable<LeaveRequestResponseDto>> GetLeaveRequestsForManagerAsync(int managerEmployeeId, string? status = null)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = $"""
            SELECT 
                lr.LeaveID,
                lr.EmployeeID,
                u.Name AS EmployeeName,
                e.Department,
                lr.LeaveType,
                lr.StartDate,
                lr.EndDate,
                COALESCE(lr.Days, {TotalDaysSql}) AS Days,
                lr.Reason,
                lr.Status,
                lr.ApprovedBy,
                apprU.Name AS ApproverName,
                lr.ApprovedAt,
                lr.ManagerComment,
                lr.CreatedAt
            FROM LeaveRequests lr
            INNER JOIN Employees e ON lr.EmployeeID = e.EmployeeID
            INNER JOIN Users u ON e.UserID = u.UserID
            LEFT JOIN Employees apprE ON lr.ApprovedBy = apprE.EmployeeID
            LEFT JOIN Users apprU ON apprE.UserID = apprU.UserID
            WHERE (e.ManagerID = @ManagerID OR lr.EmployeeID = @ManagerID)
              AND (@Status IS NULL OR lr.Status = @Status)
            ORDER BY lr.LeaveID DESC;
            """;

        return await connection.QueryAsync<LeaveRequestResponseDto>(sql, new { ManagerID = managerEmployeeId, Status = status });
    }

    public async Task<IEnumerable<LeaveRequestResponseDto>> GetAllLeaveRequestsAdminAsync(string? status = null)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = $"""
            SELECT 
                lr.LeaveID,
                lr.EmployeeID,
                u.Name AS EmployeeName,
                e.Department,
                lr.LeaveType,
                lr.StartDate,
                lr.EndDate,
                COALESCE(lr.Days, {TotalDaysSql}) AS Days,
                lr.Reason,
                lr.Status,
                lr.ApprovedBy,
                apprU.Name AS ApproverName,
                lr.ApprovedAt,
                lr.ManagerComment,
                lr.CreatedAt
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
            SELECT LeaveID, EmployeeID, LeaveType, StartDate, EndDate, Days, Reason, Status, ApprovedBy, ApprovedAt, ManagerComment, CreatedAt
            FROM LeaveRequests
            WHERE LeaveID = @LeaveID;
            """;

        return await connection.QueryFirstOrDefaultAsync<LeaveRequest>(sql, new { LeaveID = leaveId });
    }

    public async Task<LeaveRequestResponseDto?> GetLeaveRequestByIdAsync(int leaveId)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = $"""
            SELECT 
                lr.LeaveID,
                lr.EmployeeID,
                u.Name AS EmployeeName,
                e.Department,
                lr.LeaveType,
                lr.StartDate,
                lr.EndDate,
                COALESCE(lr.Days, {TotalDaysSql}) AS Days,
                lr.Reason,
                lr.Status,
                lr.ApprovedBy,
                apprU.Name AS ApproverName,
                lr.ApprovedAt,
                lr.ManagerComment,
                lr.CreatedAt
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
                lb.RemainingLeaves,
                COALESCE((
                    SELECT SUM(Days)
                    FROM LeaveRequests
                    WHERE EmployeeID = lb.EmployeeID AND Status = 'Pending'
                ), 0) AS PendingDays
            FROM LeaveBalance lb
            INNER JOIN Employees e ON lb.EmployeeID = e.EmployeeID
            INNER JOIN Users u ON e.UserID = u.UserID
            WHERE lb.EmployeeID = @EmployeeID;
            """;

        var balance = await connection.QueryFirstOrDefaultAsync<LeaveBalanceDto>(sql, new { EmployeeID = employeeId });
        if (balance != null)
        {
            balance.AvailableToRequest = Math.Max(0, balance.RemainingLeaves - balance.PendingDays);
        }
        return balance;
    }

    public async Task<int> GetPendingLeaveDaysForEmployeeAsync(int employeeId)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT COALESCE(SUM(Days), 0)
            FROM LeaveRequests
            WHERE EmployeeID = @EmployeeID AND Status = 'Pending';
            """;

        return await connection.ExecuteScalarAsync<int>(sql, new { EmployeeID = employeeId });
    }

    public async Task<LeaveRequestResponseDto> CreateLeaveRequestAsync(LeaveRequest request)
    {
        using var connection = _connectionFactory.CreateConnection();
        var isSqlite = _connectionFactory.Provider == "Sqlite";
        var currentTimestamp = isSqlite ? "datetime('now')" : "GETUTCDATE()";
        var sql = isSqlite
            ? $"""
              INSERT INTO LeaveRequests (EmployeeID, LeaveType, StartDate, EndDate, Days, Reason, Status, ApprovedBy, ApprovedAt, ManagerComment, CreatedAt)
              VALUES (@EmployeeID, @LeaveType, @StartDate, @EndDate, @Days, @Reason, 'Pending', NULL, NULL, NULL, {currentTimestamp});
              SELECT last_insert_rowid();
              """
            : $"""
              INSERT INTO LeaveRequests (EmployeeID, LeaveType, StartDate, EndDate, Days, Reason, Status, ApprovedBy, ApprovedAt, ManagerComment, CreatedAt)
              OUTPUT INSERTED.LeaveID
              VALUES (@EmployeeID, @LeaveType, @StartDate, @EndDate, @Days, @Reason, 'Pending', NULL, NULL, NULL, {currentTimestamp});
              """;

        var id = await connection.ExecuteScalarAsync<int>(sql, new
        {
            request.EmployeeID,
            request.LeaveType,
            request.StartDate,
            request.EndDate,
            request.Days,
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

    public async Task<bool> ApproveLeaveTransactionAsync(int leaveId, int employeeId, int approverEmployeeId, int daysToDeduct, string? comment = null)
    {
        using var connection = _connectionFactory.CreateConnection();
        if (connection.State != ConnectionState.Open)
        {
            connection.Open();
        }
        using var transaction = connection.BeginTransaction();

        try
        {
            var currentTimestamp = _connectionFactory.Provider == "Sqlite" ? "datetime('now')" : "GETUTCDATE()";
            // 1. Update LeaveRequest to Approved (atomic conditional check Status = 'Pending')
            var updateRequestSql = $"""
                UPDATE LeaveRequests
                SET Status = 'Approved',
                    ApprovedBy = @ApprovedBy,
                    ApprovedAt = {currentTimestamp},
                    ManagerComment = @ManagerComment
                WHERE LeaveID = @LeaveID AND Status = 'Pending';
                """;

            var updatedRows = await connection.ExecuteAsync(updateRequestSql, new
            {
                LeaveID = leaveId,
                ApprovedBy = approverEmployeeId,
                ManagerComment = comment
            }, transaction);

            if (updatedRows == 0)
            {
                transaction.Rollback();
                return false;
            }

            // 2. Atomically update LeaveBalance without writing RemainingLeaves (persisted computed column in SQL Server)
            var isSqlite = _connectionFactory.Provider == "Sqlite";
            var updateBalanceSql = isSqlite
                ? """
                  UPDATE LeaveBalance
                  SET UsedLeaves = UsedLeaves + @Days,
                      RemainingLeaves = TotalLeaves - (UsedLeaves + @Days)
                  WHERE EmployeeID = @EmployeeID AND (TotalLeaves - UsedLeaves) >= @Days;
                  """
                : """
                  UPDATE LeaveBalance
                  SET UsedLeaves = UsedLeaves + @Days
                  WHERE EmployeeID = @EmployeeID AND (TotalLeaves - UsedLeaves) >= @Days;
                  """;

            var balanceRows = await connection.ExecuteAsync(updateBalanceSql, new
            {
                EmployeeID = employeeId,
                Days = daysToDeduct
            }, transaction);

            if (balanceRows == 0)
            {
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

    public async Task<bool> RejectLeaveRequestAsync(int leaveId, int approverEmployeeId, string? comment = null)
    {
        using var connection = _connectionFactory.CreateConnection();
        var currentTimestamp = _connectionFactory.Provider == "Sqlite" ? "datetime('now')" : "GETUTCDATE()";
        var sql = $"""
            UPDATE LeaveRequests
            SET Status = 'Rejected',
                ApprovedBy = @ApprovedBy,
                ApprovedAt = {currentTimestamp},
                ManagerComment = @ManagerComment
            WHERE LeaveID = @LeaveID AND Status = 'Pending';
            """;

        var affected = await connection.ExecuteAsync(sql, new
        {
            LeaveID = leaveId,
            ApprovedBy = approverEmployeeId,
            ManagerComment = comment
        });

        return affected > 0;
    }
}
