using System;

namespace HrmsApi.Models;

public class AssetRequest
{
    public int AssetRequestID { get; set; }
    public int AssetID { get; set; }
    public int EmployeeID { get; set; }
    public string RequestType { get; set; } = string.Empty; // Repair, Return
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected, Cancelled
    public int? ReviewedBy { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? AdminComment { get; set; }
    public DateTime CreatedAt { get; set; }
}
