using HrmsApi.Helpers;
using Xunit;

namespace HrmsApi.Tests;

public class ApprovalPolicyTests
{
    [Fact]
    public void ValidateCanApproveOrReject_SelfApproval_ThrowsUnauthorizedAccessException()
    {
        // Acting employee is the same as the requester
        var ex = Assert.Throws<UnauthorizedAccessException>(() =>
            ApprovalPolicy.ValidateCanApproveOrReject(
                requesterEmployeeId: 10,
                requesterManagerId: 5,
                actorEmployeeId: 10,
                actorRole: "Employee"));

        Assert.Contains("own request", ex.Message);
    }

    [Fact]
    public void ValidateCanApproveOrReject_AdminSelfApproval_ThrowsUnauthorizedAccessException()
    {
        // Admin acts on their own request
        var ex = Assert.Throws<UnauthorizedAccessException>(() =>
            ApprovalPolicy.ValidateCanApproveOrReject(
                requesterEmployeeId: 1,
                requesterManagerId: null,
                actorEmployeeId: 1,
                actorRole: "Admin"));

        Assert.Contains("own request", ex.Message);
    }

    [Fact]
    public void ValidateCanApproveOrReject_DirectManagerActs_Succeeds()
    {
        // Manager ID 5 acts on employee 10 whose manager is 5
        var exception = Record.Exception(() =>
            ApprovalPolicy.ValidateCanApproveOrReject(
                requesterEmployeeId: 10,
                requesterManagerId: 5,
                actorEmployeeId: 5,
                actorRole: "Manager"));

        Assert.Null(exception);
    }

    [Fact]
    public void ValidateCanApproveOrReject_AdminActsWhenEmployeeHasManager_ThrowsUnauthorizedAccessException()
    {
        // Admin acts on employee 10 who already has manager 5 (Admin is read-only)
        var ex = Assert.Throws<UnauthorizedAccessException>(() =>
            ApprovalPolicy.ValidateCanApproveOrReject(
                requesterEmployeeId: 10,
                requesterManagerId: 5,
                actorEmployeeId: 1,
                actorRole: "Admin"));

        Assert.Contains("direct reporting manager", ex.Message);
    }

    [Fact]
    public void ValidateCanApproveOrReject_AdminActsWhenEmployeeHasNoManager_Succeeds()
    {
        // Employee has no manager (e.g. C-level or Manager reporting to HR Admin)
        var exception = Record.Exception(() =>
            ApprovalPolicy.ValidateCanApproveOrReject(
                requesterEmployeeId: 2,
                requesterManagerId: null,
                actorEmployeeId: 1,
                actorRole: "Admin"));

        Assert.Null(exception);
    }

    [Fact]
    public void ValidateCanApproveOrReject_NonAdminActsWhenEmployeeHasNoManager_ThrowsUnauthorizedAccessException()
    {
        // Another employee or manager tries to act on an unmanaged employee
        var ex = Assert.Throws<UnauthorizedAccessException>(() =>
            ApprovalPolicy.ValidateCanApproveOrReject(
                requesterEmployeeId: 2,
                requesterManagerId: null,
                actorEmployeeId: 5,
                actorRole: "Manager"));

        Assert.Contains("HR Administrator", ex.Message);
    }
}
