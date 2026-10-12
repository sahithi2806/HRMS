namespace HrmsApi.Helpers;

public static class ApprovalPolicy
{
    /// <summary>
    /// Validates whether the acting user is authorized to approve or reject a request.
    /// Rules (Decision #1):
    /// 1. Nobody acts on their own request (Admin included).
    /// 2. If the employee has a direct manager, only that manager may act. Admin is read-only.
    /// 3. If the employee has no manager, an Admin may act.
    /// </summary>
    public static void ValidateCanApproveOrReject(int requesterEmployeeId, int? requesterManagerId, int? actorEmployeeId, string actorRole)
    {
        if (!actorEmployeeId.HasValue)
        {
            throw new UnauthorizedAccessException("Acting user does not have an active employee profile.");
        }

        if (actorEmployeeId.Value == requesterEmployeeId)
        {
            throw new UnauthorizedAccessException("You cannot approve or reject your own request.");
        }

        if (requesterManagerId.HasValue)
        {
            if (actorEmployeeId.Value != requesterManagerId.Value)
            {
                throw new UnauthorizedAccessException("Only the employee's direct reporting manager can act on requests for their direct reports.");
            }
        }
        else
        {
            if (!string.Equals(actorRole, "Admin", StringComparison.OrdinalIgnoreCase))
            {
                throw new UnauthorizedAccessException("Only an HR Administrator can act on requests for an employee without an assigned manager.");
            }
        }
    }

    public static bool CanAct(int requesterEmployeeId, int? requesterManagerId, int? actorEmployeeId, string actorRole)
    {
        if (!actorEmployeeId.HasValue) return false;
        if (actorEmployeeId.Value == requesterEmployeeId) return false;
        if (requesterManagerId.HasValue) return actorEmployeeId.Value == requesterManagerId.Value;
        return string.Equals(actorRole, "Admin", StringComparison.OrdinalIgnoreCase);
    }
}
