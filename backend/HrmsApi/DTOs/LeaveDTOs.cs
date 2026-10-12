namespace HrmsApi.DTOs;

public class CreateLeaveRequestDto
{
    public string LeaveType { get; set; } = string.Empty; // Casual, Sick, Earned
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class LeaveRequestResponseDto
{
    public int LeaveID { get; set; }
    public int EmployeeID { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string LeaveType { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int Days { get; set; }
    public int TotalDays => Days; // Backward-compatible alias
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected
    public int? ApprovedBy { get; set; }
    public string? ApproverName { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? ManagerComment { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class LeaveBalanceDto
{
    public int LeaveBalanceID { get; set; }
    public int EmployeeID { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public int TotalLeaves { get; set; }
    public int UsedLeaves { get; set; }
    public int RemainingLeaves { get; set; }
    public int PendingDays { get; set; }
    public int AvailableToRequest { get; set; }
}

public class LeaveActionDto
{
    public string? Comment { get; set; }
}
