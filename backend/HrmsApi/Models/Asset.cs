using System;

namespace HrmsApi.Models;

public class Asset
{
    public int AssetID { get; set; }
    public string AssetTag { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty; // Laptop, Mobile, Monitor, Accessory, Other
    public string? SerialNumber { get; set; }
    public string? PurchaseDate { get; set; }
    public string Status { get; set; } = "Available"; // Available, Assigned, UnderRepair, Retired
    public DateTime CreatedAt { get; set; }
}
