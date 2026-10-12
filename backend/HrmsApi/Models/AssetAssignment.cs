using System;

namespace HrmsApi.Models;

public class AssetAssignment
{
    public int AssignmentID { get; set; }
    public int AssetID { get; set; }
    public int EmployeeID { get; set; }
    public DateTime AssignedAt { get; set; }
    public int AssignedBy { get; set; }
    public DateTime? ReturnedAt { get; set; }
}
