using System;

namespace HrmsApi.DTOs;

public class AssetDto
{
    public int AssetID { get; set; }
    public string AssetTag { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? SerialNumber { get; set; }
    public string? PurchaseDate { get; set; }
    public string Status { get; set; } = "Available";
    public DateTime CreatedAt { get; set; }

    // Active assignment details (if assigned)
    public int? CurrentAssignmentID { get; set; }
    public int? AssignedToEmployeeID { get; set; }
    public string? AssignedToEmployeeName { get; set; }
    public string? AssignedToDepartment { get; set; }
    public DateTime? AssignedAt { get; set; }
}

public class CreateAssetDto
{
    public string AssetTag { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? SerialNumber { get; set; }
    public string? PurchaseDate { get; set; }
}

public class UpdateAssetDto
{
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? SerialNumber { get; set; }
    public string? PurchaseDate { get; set; }
}

public class AssignAssetDto
{
    public int EmployeeID { get; set; }
}

public class UpdateAssetStatusDto
{
    public string Status { get; set; } = string.Empty;
}

public class CreateAssetRequestDto
{
    public int AssetID { get; set; }
    public string RequestType { get; set; } = string.Empty; // 'Repair', 'Return'
    public string Description { get; set; } = string.Empty;
}

public class ReviewAssetRequestDto
{
    public string? Comment { get; set; }
}

public class AssetRequestDto
{
    public int AssetRequestID { get; set; }
    public int AssetID { get; set; }
    public string AssetTag { get; set; } = string.Empty;
    public string AssetName { get; set; } = string.Empty;
    public string AssetCategory { get; set; } = string.Empty;
    public int EmployeeID { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string RequestType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending";
    public int? ReviewedBy { get; set; }
    public string? ReviewerName { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? AdminComment { get; set; }
    public DateTime CreatedAt { get; set; }
}
