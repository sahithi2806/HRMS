using System;

namespace HrmsApi.DTOs;

public class CreateRegularizationDto
{
    public string WorkDate { get; set; } = string.Empty; // YYYY-MM-DD
    public DateTime RequestedCheckIn { get; set; }
    public DateTime RequestedCheckOut { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class ReviewRegularizationDto
{
    public string? Comment { get; set; }
}

public class RegularizationDto
{
    public int RegularizationID { get; set; }
    public int EmployeeID { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string WorkDate { get; set; } = string.Empty;
    public DateTime RequestedCheckIn { get; set; }
    public DateTime RequestedCheckOut { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending";
    public int? ApprovedBy { get; set; }
    public string? ApproverName { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? ManagerComment { get; set; }
    public DateTime CreatedAt { get; set; }
}
