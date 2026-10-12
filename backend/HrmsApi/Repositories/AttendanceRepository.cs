using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Dapper;
using HrmsApi.Data;
using HrmsApi.DTOs;
using HrmsApi.Models;

namespace HrmsApi.Repositories;

public class AttendanceRepository : IAttendanceRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public AttendanceRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<Attendance?> GetByEmployeeAndDateAsync(int employeeId, string workDate)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT AttendanceID, EmployeeID, WorkDate, CheckInAt, CheckOutAt, IsLate, Status, Source, CreatedAt
            FROM Attendance
            WHERE EmployeeID = @EmployeeID AND WorkDate = @WorkDate;
            """;
        return await connection.QuerySingleOrDefaultAsync<Attendance>(sql, new { EmployeeID = employeeId, WorkDate = workDate });
    }

    public async Task<int> CheckInAsync(int employeeId, string workDate, DateTime checkInAt, bool isLate, string source)
    {
        using var connection = _connectionFactory.CreateConnection();
        if (_connectionFactory.Provider == "Sqlite")
        {
            const string sql = """
                INSERT INTO Attendance (EmployeeID, WorkDate, CheckInAt, IsLate, Status, Source, CreatedAt)
                VALUES (@EmployeeID, @WorkDate, @CheckInAt, @IsLate, 'Present', @Source, CURRENT_TIMESTAMP);
                SELECT last_insert_rowid();
                """;
            return await connection.ExecuteScalarAsync<int>(sql, new
            {
                EmployeeID = employeeId,
                WorkDate = workDate,
                CheckInAt = checkInAt.ToString("yyyy-MM-dd HH:mm:ss"),
                IsLate = isLate ? 1 : 0,
                Source = source
            });
        }
        else
        {
            const string sql = """
                INSERT INTO Attendance (EmployeeID, WorkDate, CheckInAt, IsLate, Status, Source, CreatedAt)
                VALUES (@EmployeeID, @WorkDate, @CheckInAt, @IsLate, 'Present', @Source, GETUTCDATE());
                SELECT CAST(SCOPE_IDENTITY() AS INT);
                """;
            return await connection.ExecuteScalarAsync<int>(sql, new
            {
                EmployeeID = employeeId,
                WorkDate = workDate,
                CheckInAt = checkInAt,
                IsLate = isLate,
                Source = source
            });
        }
    }

    public async Task<bool> CheckOutAsync(int employeeId, string workDate, DateTime checkOutAt, string status)
    {
        using var connection = _connectionFactory.CreateConnection();
        string checkOutVal = _connectionFactory.Provider == "Sqlite" ? checkOutAt.ToString("yyyy-MM-dd HH:mm:ss") : checkOutAt.ToString("o");

        const string sql = """
            UPDATE Attendance
            SET CheckOutAt = @CheckOutAt,
                Status = @Status
            WHERE EmployeeID = @EmployeeID 
              AND WorkDate = @WorkDate 
              AND CheckOutAt IS NULL;
            """;

        var rowsAffected = await connection.ExecuteAsync(sql, new
        {
            EmployeeID = employeeId,
            WorkDate = workDate,
            CheckOutAt = checkOutVal,
            Status = status
        });

        return rowsAffected > 0;
    }

    public async Task<IEnumerable<Attendance>> GetMonthlyRecordsAsync(int employeeId, string startMonthDate, string endMonthDate)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT AttendanceID, EmployeeID, WorkDate, CheckInAt, CheckOutAt, IsLate, Status, Source, CreatedAt
            FROM Attendance
            WHERE EmployeeID = @EmployeeID
              AND WorkDate >= @StartDate
              AND WorkDate <= @EndDate
            ORDER BY WorkDate ASC;
            """;
        return await connection.QueryAsync<Attendance>(sql, new
        {
            EmployeeID = employeeId,
            StartDate = startMonthDate,
            EndDate = endMonthDate
        });
    }

    public async Task<IEnumerable<TeamAttendanceDto>> GetTeamAttendanceAsync(int? managerId, string workDate, bool isAdmin)
    {
        using var connection = _connectionFactory.CreateConnection();
        string sql = isAdmin
            ? """
                SELECT e.EmployeeID, u.Name AS EmployeeName, e.Department, e.Position, @WorkDate AS WorkDate,
                       a.CheckInAt, a.CheckOutAt, COALESCE(a.IsLate, 0) AS IsLate,
                       COALESCE(a.Status, 'NotCheckedIn') AS Status,
                       0.0 AS TotalHours
                FROM Employees e
                INNER JOIN Users u ON e.UserID = u.UserID
                LEFT JOIN Attendance a ON e.EmployeeID = a.EmployeeID AND a.WorkDate = @WorkDate
                WHERE e.Status = 'Active'
                ORDER BY e.Department, u.Name;
              """
            : """
                SELECT e.EmployeeID, u.Name AS EmployeeName, e.Department, e.Position, @WorkDate AS WorkDate,
                       a.CheckInAt, a.CheckOutAt, COALESCE(a.IsLate, 0) AS IsLate,
                       COALESCE(a.Status, 'NotCheckedIn') AS Status,
                       0.0 AS TotalHours
                FROM Employees e
                INNER JOIN Users u ON e.UserID = u.UserID
                LEFT JOIN Attendance a ON e.EmployeeID = a.EmployeeID AND a.WorkDate = @WorkDate
                WHERE e.Status = 'Active' AND e.ManagerID = @ManagerID
                ORDER BY u.Name;
              """;

        return await connection.QueryAsync<TeamAttendanceDto>(sql, new
        {
            ManagerID = managerId,
            WorkDate = workDate
        });
    }

    public async Task<bool> UpsertRegularizedAttendanceAsync(int employeeId, string workDate, DateTime checkInAt, DateTime checkOutAt, bool isLate, string status)
    {
        using var connection = _connectionFactory.CreateConnection();
        var existing = await GetByEmployeeAndDateAsync(employeeId, workDate);
        if (existing == null)
        {
            if (_connectionFactory.Provider == "Sqlite")
            {
                const string insertSql = """
                    INSERT INTO Attendance (EmployeeID, WorkDate, CheckInAt, CheckOutAt, IsLate, Status, Source, CreatedAt)
                    VALUES (@EmployeeID, @WorkDate, @CheckInAt, @CheckOutAt, @IsLate, @Status, 'Regularized', CURRENT_TIMESTAMP);
                    """;
                var rows = await connection.ExecuteAsync(insertSql, new
                {
                    EmployeeID = employeeId,
                    WorkDate = workDate,
                    CheckInAt = checkInAt.ToString("yyyy-MM-dd HH:mm:ss"),
                    CheckOutAt = checkOutAt.ToString("yyyy-MM-dd HH:mm:ss"),
                    IsLate = isLate ? 1 : 0,
                    Status = status
                });
                return rows > 0;
            }
            else
            {
                const string insertSql = """
                    INSERT INTO Attendance (EmployeeID, WorkDate, CheckInAt, CheckOutAt, IsLate, Status, Source, CreatedAt)
                    VALUES (@EmployeeID, @WorkDate, @CheckInAt, @CheckOutAt, @IsLate, @Status, 'Regularized', GETUTCDATE());
                    """;
                var rows = await connection.ExecuteAsync(insertSql, new
                {
                    EmployeeID = employeeId,
                    WorkDate = workDate,
                    CheckInAt = checkInAt,
                    CheckOutAt = checkOutAt,
                    IsLate = isLate,
                    Status = status
                });
                return rows > 0;
            }
        }
        else
        {
            string checkInStr = _connectionFactory.Provider == "Sqlite" ? checkInAt.ToString("yyyy-MM-dd HH:mm:ss") : checkInAt.ToString("o");
            string checkOutStr = _connectionFactory.Provider == "Sqlite" ? checkOutAt.ToString("yyyy-MM-dd HH:mm:ss") : checkOutAt.ToString("o");

            const string updateSql = """
                UPDATE Attendance
                SET CheckInAt = @CheckInAt,
                    CheckOutAt = @CheckOutAt,
                    IsLate = @IsLate,
                    Status = @Status,
                    Source = 'Regularized'
                WHERE EmployeeID = @EmployeeID AND WorkDate = @WorkDate;
                """;
            var rows = await connection.ExecuteAsync(updateSql, new
            {
                EmployeeID = employeeId,
                WorkDate = workDate,
                CheckInAt = checkInStr,
                CheckOutAt = checkOutStr,
                IsLate = isLate ? 1 : 0,
                Status = status
            });
            return rows > 0;
        }
    }
}
