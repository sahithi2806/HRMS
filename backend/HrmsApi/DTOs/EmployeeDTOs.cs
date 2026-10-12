namespace HrmsApi.DTOs;

public class CreateEmployeeDto
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Role { get; set; } = "Employee"; // Admin, Manager, Employee
    public string Department { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public DateTime JoiningDate { get; set; }
    public decimal Salary { get; set; }
    public int? ManagerID { get; set; }
    public int TotalLeaves { get; set; } = 0;
}

public class UpdateEmployeeDto
{
    public string Department { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public decimal Salary { get; set; }
    public int? ManagerID { get; set; }
}

public class UpdateEmployeeStatusDto
{
    public string Status { get; set; } = "Active"; // Active, Inactive
    public string? ExitReason { get; set; }
}

public class EmployeeResponseDto
{
    public int EmployeeID { get; set; }
    public int UserID { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public DateTime JoiningDate { get; set; }
    public decimal Salary { get; set; }
    public string Status { get; set; } = "Active";
    public int? ManagerID { get; set; }
    public string? ManagerName { get; set; }
    public int? TotalLeaves { get; set; }
    public int? UsedLeaves { get; set; }
    public int? RemainingLeaves { get; set; }
    public DateTime? DeactivatedAt { get; set; }
    public string? ExitReason { get; set; }
    public DateTime CreatedAt { get; set; }
}
