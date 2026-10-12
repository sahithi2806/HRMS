using System;

namespace HrmsApi.Models;

public class Attendance
{
    public int AttendanceID { get; set; }
    public int EmployeeID { get; set; }
    public string WorkDate { get; set; } = string.Empty; // YYYY-MM-DD
    public DateTime CheckInAt { get; set; }
    public DateTime? CheckOutAt { get; set; }
    public bool IsLate { get; set; }
    public string? Status { get; set; } // Present, HalfDay, Absent
    public string Source { get; set; } = "Self"; // Self, Regularized
    public DateTime CreatedAt { get; set; }
}
