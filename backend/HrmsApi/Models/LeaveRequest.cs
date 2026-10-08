namespace HrmsApi.Models;

public class LeaveRequest
{
    public int LeaveID { get; set; }
    public int EmployeeID { get; set; }
    public string LeaveType { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending";
    public int? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
}
