using System;
using System.Collections.Generic;

namespace HrmsApi.DTOs;

public class AttendanceRecordDto
{
    public int AttendanceID { get; set; }
    public int EmployeeID { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string WorkDate { get; set; } = string.Empty;
    public DateTime CheckInAt { get; set; }
    public DateTime? CheckOutAt { get; set; }
    public bool IsLate { get; set; }
    public string? Status { get; set; }
    public string Source { get; set; } = "Self";
    public double? TotalHours { get; set; }
}

public class TodayAttendanceDto
{
    public string WorkDate { get; set; } = string.Empty;
    public string State { get; set; } = "NotCheckedIn"; // NotCheckedIn, CheckedIn, CheckedOut, OnLeave, Weekend
    public DateTime? CheckInAt { get; set; }
    public DateTime? CheckOutAt { get; set; }
    public bool IsLate { get; set; }
    public string? Status { get; set; }
    public double TotalHours { get; set; }
    public bool CanCheckIn { get; set; }
    public bool CanCheckOut { get; set; }
    public string? Message { get; set; }
}

public class AttendanceCalendarDayDto
{
    public string Date { get; set; } = string.Empty;
    public string DayOfWeek { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty; // Present, Late, HalfDay, Absent, OnLeave, Weekend, MissingCheckOut, NotCheckedIn
    public DateTime? CheckInAt { get; set; }
    public DateTime? CheckOutAt { get; set; }
    public bool IsLate { get; set; }
    public double TotalHours { get; set; }
    public bool CanRegularize { get; set; }
    public string? LeaveType { get; set; }
}

public class MonthlyAttendanceSummaryDto
{
    public string Month { get; set; } = string.Empty;
    public int TotalDaysInMonth { get; set; }
    public int WorkingDays { get; set; }
    public int PresentDays { get; set; }
    public int LateDays { get; set; }
    public int HalfDays { get; set; }
    public int AbsentDays { get; set; }
    public int LeaveDays { get; set; }
    public List<AttendanceCalendarDayDto> Days { get; set; } = new();
}

public class TeamAttendanceDto
{
    public int EmployeeID { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public string WorkDate { get; set; } = string.Empty;
    public DateTime? CheckInAt { get; set; }
    public DateTime? CheckOutAt { get; set; }
    public bool IsLate { get; set; }
    public string Status { get; set; } = "NotCheckedIn";
    public double TotalHours { get; set; }
}
