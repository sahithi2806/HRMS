using System;

namespace HrmsApi.Models;

public class Ticket
{
    public int TicketID { get; set; }
    public int EmployeeID { get; set; }
    public string Category { get; set; } = string.Empty; // IT, HR, Payroll, Facilities, Admin, Other
    public string Subject { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Priority { get; set; } = "Medium"; // Low, Medium, High
    public string Status { get; set; } = "Open"; // Open, InProgress, Resolved, Closed
    public int? AssignedTo { get; set; }
    public int? FeedbackRating { get; set; }
    public string? FeedbackComment { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
}
