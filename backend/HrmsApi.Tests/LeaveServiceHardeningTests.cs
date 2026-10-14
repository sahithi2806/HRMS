using HrmsApi.DTOs;
using HrmsApi.Models;
using HrmsApi.Repositories;
using HrmsApi.Services;
using Moq;
using Xunit;

namespace HrmsApi.Tests;

public class LeaveServiceHardeningTests
{
    private readonly Mock<ILeaveRepository> _mockLeaveRepo;
    private readonly Mock<IEmployeeRepository> _mockEmpRepo;
    private readonly LeaveService _service;

    public LeaveServiceHardeningTests()
    {
        _mockLeaveRepo = new Mock<ILeaveRepository>();
        _mockEmpRepo = new Mock<IEmployeeRepository>();
        _service = new LeaveService(_mockLeaveRepo.Object, _mockEmpRepo.Object);
    }

    [Fact]
    public async Task SubmitLeaveRequest_WeekendSpanning_CountsOnlyBusinessDays()
    {
        var empId = 8;
        // 2026-10-16 (Fri) to 2026-10-19 (Mon) -> 2 business days
        var start = new DateTime(2026, 10, 16);
        var end = new DateTime(2026, 10, 19);

        var balance = new LeaveBalanceDto
        {
            EmployeeID = empId,
            TotalLeaves = 20,
            UsedLeaves = 5,
            RemainingLeaves = 15,
            PendingDays = 0,
            AvailableToRequest = 15
        };

        _mockLeaveRepo.Setup(r => r.GetLeaveBalanceAsync(empId))
            .ReturnsAsync(balance);
        _mockLeaveRepo.Setup(r => r.HasOverlappingLeaveAsync(empId, start, end))
            .ReturnsAsync(false);

        LeaveRequest? savedRequest = null;
        _mockLeaveRepo.Setup(r => r.CreateLeaveRequestAsync(It.IsAny<LeaveRequest>()))
            .Callback<LeaveRequest>(req => savedRequest = req)
            .ReturnsAsync(new LeaveRequestResponseDto { LeaveID = 1, Days = 2 });

        var dto = new CreateLeaveRequestDto
        {
            LeaveType = "Casual",
            StartDate = start,
            EndDate = end,
            Reason = "Family trip"
        };

        await _service.SubmitLeaveRequestAsync(empId, dto);

        Assert.NotNull(savedRequest);
        Assert.Equal(2, savedRequest.Days);
    }

    [Fact]
    public async Task SubmitLeaveRequest_WhenAvailableDaysInsufficientDueToPendingRequests_ThrowsInvalidOperationException()
    {
        var empId = 8;
        // Mon-Wed: 3 business days in future
        var start = new DateTime(2026, 10, 19);
        var end = new DateTime(2026, 10, 21);

        // Remaining is 5, but Pending is 3 -> Available is 2
        var balance = new LeaveBalanceDto
        {
            EmployeeID = empId,
            TotalLeaves = 20,
            UsedLeaves = 15,
            RemainingLeaves = 5,
            PendingDays = 3,
            AvailableToRequest = 2
        };

        _mockLeaveRepo.Setup(r => r.GetLeaveBalanceAsync(empId))
            .ReturnsAsync(balance);
        _mockLeaveRepo.Setup(r => r.GetPendingLeaveDaysForEmployeeAsync(empId))
            .ReturnsAsync(3);
        _mockLeaveRepo.Setup(r => r.HasOverlappingLeaveAsync(empId, start, end))
            .ReturnsAsync(false);

        var dto = new CreateLeaveRequestDto
        {
            LeaveType = "Casual",
            StartDate = start,
            EndDate = end,
            Reason = "Long vacation"
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.SubmitLeaveRequestAsync(empId, dto));

        Assert.Contains("Insufficient leave balance", ex.Message);
    }

    [Fact]
    public async Task ApproveLeave_WhenAdminTriesToApproveOwnLeave_ThrowsUnauthorizedAccessException()
    {
        var adminEmpId = 1;
        var leaveId = 10;
        var request = new LeaveRequest
        {
            LeaveID = leaveId,
            EmployeeID = adminEmpId,
            Status = "Pending"
        };

        var employee = new EmployeeResponseDto
        {
            EmployeeID = adminEmpId,
            ManagerID = null,
            Role = "Admin"
        };

        _mockLeaveRepo.Setup(r => r.GetLeaveRequestEntityByIdAsync(leaveId)).ReturnsAsync(request);
        _mockEmpRepo.Setup(r => r.GetEmployeeByIdAsync(adminEmpId)).ReturnsAsync(employee);

        var ex = await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            _service.ApproveLeaveAsync(leaveId, "Admin", managerEmployeeId: adminEmpId));

        Assert.Contains("own request", ex.Message);
    }
}
