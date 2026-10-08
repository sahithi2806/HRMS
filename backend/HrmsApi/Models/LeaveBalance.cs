namespace HrmsApi.Models;

public class LeaveBalance
{
    public int LeaveBalanceID { get; set; }
    public int EmployeeID { get; set; }
    public int TotalLeaves { get; set; } = 20;
    public int UsedLeaves { get; set; } = 0;
    public int RemainingLeaves { get; set; } = 20;
}
