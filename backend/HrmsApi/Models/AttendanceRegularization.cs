using System;

namespace HrmsApi.Models;

public class AttendanceRegularization
{
    public int RegularizationID { get; set; }
    public int EmployeeID { get; set; }
    public string WorkDate { get; set; } = string.Empty; // YYYY-MM-DD
    public DateTime RequestedCheckIn { get; set; }
    public DateTime RequestedCheckOut { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected, Cancelled
    public int? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? ManagerComment { get; set; }
    public DateTime CreatedAt { get; set; }
}
