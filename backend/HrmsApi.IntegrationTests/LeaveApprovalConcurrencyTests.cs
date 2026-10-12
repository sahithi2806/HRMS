using System.Net;
using System.Net.Http.Json;
using System.Threading.Tasks;
using HrmsApi.DTOs;
using Xunit;

namespace HrmsApi.IntegrationTests;

public class LeaveApprovalConcurrencyTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public LeaveApprovalConcurrencyTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task SimultaneousLeaveApprovals_OnlyOneSucceeds()
    {
        // Employee 8 (reports to Manager 2)
        var employeeClient = _factory.CreateAuthenticatedClient(8, "employee@hrms.com", "Employee", 8, "Saha Reddy");
        // Manager 2
        var managerClient = _factory.CreateAuthenticatedClient(2, "manager@hrms.com", "Manager", 2, "Vikramaditya Verma");

        // 1. Employee 8 submits a leave request
        var leaveDto = new CreateLeaveRequestDto
        {
            LeaveType = "Casual",
            StartDate = new DateTime(2026, 11, 16), // Monday
            EndDate = new DateTime(2026, 11, 17),   // Tuesday
            Reason = "Integration concurrency test trip"
        };
        var applyRes = await employeeClient.PostAsJsonAsync("/api/leave", leaveDto);
        applyRes.EnsureSuccessStatusCode();
        var createdLeave = await applyRes.Content.ReadFromJsonAsync<LeaveRequestResponseDto>();
        Assert.NotNull(createdLeave);
        int leaveId = createdLeave.LeaveID;

        // 2. Launch two concurrent approval requests
        var task1 = managerClient.PutAsJsonAsync($"/api/leave/{leaveId}/approve", new { comment = "Approval 1" });
        var task2 = managerClient.PutAsJsonAsync($"/api/leave/{leaveId}/approve", new { comment = "Approval 2" });

        var results = await Task.WhenAll(task1, task2);

        // Exactly one should succeed with 200 OK
        int successCount = 0;
        int failureCount = 0;

        foreach (var res in results)
        {
            if (res.StatusCode == HttpStatusCode.OK)
            {
                successCount++;
            }
            else
            {
                failureCount++;
            }
        }

        Assert.Equal(1, successCount);
        Assert.Equal(1, failureCount);
    }
}
