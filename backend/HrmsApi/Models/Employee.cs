namespace HrmsApi.Models;

public class Employee
{
    public int EmployeeID { get; set; }
    public int UserID { get; set; }
    public string Department { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public DateTime JoiningDate { get; set; }
    public decimal Salary { get; set; }
    public string Status { get; set; } = "Active";
    public int? ManagerID { get; set; }
    public DateTime? DeactivatedAt { get; set; }
    public string? ExitReason { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
