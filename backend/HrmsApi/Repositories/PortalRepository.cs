using System;
using System.Threading.Tasks;
using Dapper;
using HrmsApi.Data;
using HrmsApi.DTOs;
using HrmsApi.Helpers;

namespace HrmsApi.Repositories;

public class PortalRepository : IPortalRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public PortalRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<PortalSummaryDto> GetPortalSummaryAsync(int employeeId, string role, string workDate)
    {
        using var connection = _connectionFactory.CreateConnection();

        // 1. Employee profile & manager info
        const string empSql = """
            SELECT e.EmployeeID, u.Name AS EmployeeName, u.Email, u.Role,
                   e.Department, e.Position, e.JoiningDate, e.ManagerID,
                   mu.Name AS ManagerName
            FROM Employees e
            INNER JOIN Users u ON e.UserID = u.UserID
            LEFT JOIN Employees m ON e.ManagerID = m.EmployeeID
            LEFT JOIN Users mu ON m.UserID = mu.UserID
            WHERE e.EmployeeID = @EmployeeID;
            """;
        var summary = await connection.QuerySingleOrDefaultAsync<PortalSummaryDto>(empSql, new { EmployeeID = employeeId })
            ?? throw new System.Collections.Generic.KeyNotFoundException($"Employee #{employeeId} not found.");

        // 2. Leave Balance
        const string balanceSql = """
            SELECT TotalLeaves, UsedLeaves, (TotalLeaves - UsedLeaves) AS RemainingLeaves
            FROM LeaveBalance
            WHERE EmployeeID = @EmployeeID;
            """;
        var balance = await connection.QuerySingleOrDefaultAsync<LeaveBalanceDto>(balanceSql, new { EmployeeID = employeeId });
        if (balance != null)
        {
            const string pendingLeavesSql = """
                SELECT COALESCE(SUM(Days), 0)
                FROM LeaveRequests
                WHERE EmployeeID = @EmployeeID AND Status = 'Pending';
                """;
            var pendingDays = await connection.ExecuteScalarAsync<int>(pendingLeavesSql, new { EmployeeID = employeeId });
            balance.EmployeeID = employeeId;
            balance.EmployeeName = summary.EmployeeName;
            balance.PendingDays = pendingDays;
            balance.AvailableToRequest = Math.Max(0, balance.RemainingLeaves - pendingDays);
            summary.LeaveBalance = balance;
        }

        // 3. Today's Attendance & Leave status
        const string attSql = """
            SELECT AttendanceID, CheckInAt, CheckOutAt, IsLate, Status
            FROM Attendance
            WHERE EmployeeID = @EmployeeID AND WorkDate = @WorkDate;
            """;
        var att = await connection.QuerySingleOrDefaultAsync<dynamic>(attSql, new { EmployeeID = employeeId, WorkDate = workDate });

        const string onLeaveSql = """
            SELECT LeaveType
            FROM LeaveRequests
            WHERE EmployeeID = @EmployeeID AND Status = 'Approved'
              AND StartDate <= @WorkDate AND EndDate >= @WorkDate;
            """;
        var onLeaveType = await connection.QuerySingleOrDefaultAsync<string>(onLeaveSql, new { EmployeeID = employeeId, WorkDate = workDate });

        var dateOnly = DateOnly.Parse(workDate);
        var isWeekend = AttendanceCalculator.IsWeekend(dateOnly);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        DateTime? checkIn = null;
        DateTime? checkOut = null;
        bool isLate = false;
        string? storedStatus = null;

        if (att != null)
        {
            string? ciStr = (string?)att.CheckInAt?.ToString();
            if (!string.IsNullOrEmpty(ciStr) && DateTime.TryParse(ciStr, out var ci))
            {
                checkIn = ci;
            }

            string? coStr = (string?)att.CheckOutAt?.ToString();
            if (!string.IsNullOrEmpty(coStr) && DateTime.TryParse(coStr, out var co))
            {
                checkOut = co;
            }

            isLate = att.IsLate is bool b ? b : (att.IsLate == 1);
            storedStatus = (string?)att.Status;
        }

        var derivedState = AttendanceCalculator.DeriveDayStatus(dateOnly, today, isWeekend, onLeaveType != null, checkIn, checkOut, storedStatus);

        double totalHours = 0.0;
        if (checkIn.HasValue && checkOut.HasValue)
        {
            totalHours = Math.Round((checkOut.Value - checkIn.Value).TotalHours, 1);
        }
        else if (checkIn.HasValue)
        {
            totalHours = Math.Round((DateTime.UtcNow - checkIn.Value).TotalHours, 1);
        }

        summary.TodayAttendance = new TodayAttendanceDto
        {
            WorkDate = workDate,
            State = derivedState,
            CheckInAt = checkIn,
            CheckOutAt = checkOut,
            IsLate = isLate,
            Status = storedStatus ?? (derivedState == "CheckedIn" ? "Present" : derivedState),
            TotalHours = totalHours,
            CanCheckIn = !isWeekend && onLeaveType == null && checkIn == null,
            CanCheckOut = checkIn != null && checkOut == null
        };

        // 4. Next Approved Leave
        string nextLeaveSql = _connectionFactory.Provider == "Sqlite"
            ? """
                SELECT LeaveID, LeaveType, StartDate, EndDate, Days, Reason
                FROM LeaveRequests
                WHERE EmployeeID = @EmployeeID AND Status = 'Approved' AND StartDate >= @WorkDate
                ORDER BY StartDate ASC LIMIT 1;
              """
            : """
                SELECT TOP 1 LeaveID, LeaveType, StartDate, EndDate, Days, Reason
                FROM LeaveRequests
                WHERE EmployeeID = @EmployeeID AND Status = 'Approved' AND StartDate >= @WorkDate
                ORDER BY StartDate ASC;
              """;
        summary.NextLeave = await connection.QuerySingleOrDefaultAsync<NextLeaveDto>(nextLeaveSql, new { EmployeeID = employeeId, WorkDate = workDate });

        // 5. Pending Approvals Count (for Manager / Admin)
        if (role == "Manager")
        {
            const string pendingLeavesSql = """
                SELECT COUNT(1)
                FROM LeaveRequests lr
                INNER JOIN Employees e ON lr.EmployeeID = e.EmployeeID
                WHERE lr.Status = 'Pending' AND e.ManagerID = @EmployeeID AND lr.EmployeeID <> @EmployeeID;
                """;
            var pendingLeaves = await connection.ExecuteScalarAsync<int>(pendingLeavesSql, new { EmployeeID = employeeId });

            const string pendingRegsSql = """
                SELECT COUNT(1)
                FROM AttendanceRegularizations ar
                INNER JOIN Employees e ON ar.EmployeeID = e.EmployeeID
                WHERE ar.Status = 'Pending' AND e.ManagerID = @EmployeeID AND ar.EmployeeID <> @EmployeeID;
                """;
            var pendingRegs = await connection.ExecuteScalarAsync<int>(pendingRegsSql, new { EmployeeID = employeeId });

            summary.PendingApprovalsCount = pendingLeaves + pendingRegs;
        }
        else if (role == "Admin")
        {
            const string pendingLeavesSql = """
                SELECT COUNT(1)
                FROM LeaveRequests lr
                INNER JOIN Employees e ON lr.EmployeeID = e.EmployeeID
                WHERE lr.Status = 'Pending' AND e.ManagerID IS NULL AND lr.EmployeeID <> @EmployeeID;
                """;
            var pendingLeaves = await connection.ExecuteScalarAsync<int>(pendingLeavesSql, new { EmployeeID = employeeId });

            const string pendingRegsSql = """
                SELECT COUNT(1)
                FROM AttendanceRegularizations ar
                INNER JOIN Employees e ON ar.EmployeeID = e.EmployeeID
                WHERE ar.Status = 'Pending' AND e.ManagerID IS NULL AND ar.EmployeeID <> @EmployeeID;
                """;
            var pendingRegs = await connection.ExecuteScalarAsync<int>(pendingRegsSql, new { EmployeeID = employeeId });

            summary.PendingApprovalsCount = pendingLeaves + pendingRegs;
        }

        return summary;
    }
}
