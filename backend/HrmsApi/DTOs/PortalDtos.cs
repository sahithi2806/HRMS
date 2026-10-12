using System;

namespace HrmsApi.DTOs;

public class NextLeaveDto
{
    public int LeaveID { get; set; }
    public string LeaveType { get; set; } = string.Empty;
    public string StartDate { get; set; } = string.Empty;
    public string EndDate { get; set; } = string.Empty;
    public int Days { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class PortalSummaryDto
{
    public int EmployeeID { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string JoiningDate { get; set; } = string.Empty;
    public int? ManagerID { get; set; }
    public string? ManagerName { get; set; }

    public LeaveBalanceDto LeaveBalance { get; set; } = new();
    public TodayAttendanceDto TodayAttendance { get; set; } = new();
    public NextLeaveDto? NextLeave { get; set; }

    public int MyAssetsCount { get; set; } = 0;
    public int OpenTicketsCount { get; set; } = 0;
    public int PendingExpensesCount { get; set; } = 0;
    public int PendingApprovalsCount { get; set; } = 0;
}
