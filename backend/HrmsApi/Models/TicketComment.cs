using System;

namespace HrmsApi.Models;

public class TicketComment
{
    public int CommentID { get; set; }
    public int TicketID { get; set; }
    public int AuthorEmployeeID { get; set; }
    public string Body { get; set; } = string.Empty;
    public bool IsInternal { get; set; }
    public DateTime CreatedAt { get; set; }
}
