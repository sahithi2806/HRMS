using System;
using System.Collections.Generic;

namespace HrmsApi.DTOs;

public class CreateTicketDto
{
    public string Category { get; set; } = string.Empty; // IT, HR, Payroll, Facilities, Admin, Other
    public string Subject { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Priority { get; set; } = "Medium"; // Low, Medium, High
}

public class CreateCommentDto
{
    public string Body { get; set; } = string.Empty;
    public bool IsInternal { get; set; } = false;
}

public class UpdateTicketDto
{
    public string? Status { get; set; }
    public int? AssignedTo { get; set; }
    public string? Priority { get; set; }
}

public class TicketFeedbackDto
{
    public int Rating { get; set; } // 1-5
    public string? Comment { get; set; }
}

public class TicketDto
{
    public int TicketID { get; set; }
    public int EmployeeID { get; set; }
    public string? EmployeeName { get; set; }
    public string? Department { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Priority { get; set; } = "Medium";
    public string Status { get; set; } = "Open";
    public int? AssignedTo { get; set; }
    public string? AssignedToName { get; set; }
    public int? FeedbackRating { get; set; }
    public string? FeedbackComment { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public int CommentsCount { get; set; }
    public List<TicketCommentDto>? Comments { get; set; }
}

public class TicketCommentDto
{
    public int CommentID { get; set; }
    public int TicketID { get; set; }
    public int AuthorEmployeeID { get; set; }
    public string? AuthorName { get; set; }
    public string? AuthorRole { get; set; }
    public string Body { get; set; } = string.Empty;
    public bool IsInternal { get; set; }
    public DateTime CreatedAt { get; set; }
}
