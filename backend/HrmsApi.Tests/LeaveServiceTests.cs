using HrmsApi.DTOs;
using HrmsApi.Models;
using HrmsApi.Repositories;
using HrmsApi.Services;
using Moq;
using Xunit;

namespace HrmsApi.Tests;

public class LeaveServiceTests
{
    private readonly Mock<ILeaveRepository> _mockLeaveRepo;
    private readonly Mock<IEmployeeRepository> _mockEmpRepo;
    private readonly LeaveService _leaveService;

    public LeaveServiceTests()
    {
        _mockLeaveRepo = new Mock<ILeaveRepository>();
        _mockEmpRepo = new Mock<IEmployeeRepository>();
        _leaveService = new LeaveService(_mockLeaveRepo.Object, _mockEmpRepo.Object);
    }

    [Fact]
    public async Task SubmitLeaveRequest_WhenEmployeeIdIsNull_ThrowsArgumentException()
    {
        var dto = new CreateLeaveRequestDto
        {
            LeaveType = "Casual",
            StartDate = DateTime.UtcNow.AddDays(1),
            EndDate = DateTime.UtcNow.AddDays(2),
            Reason = "Personal work"
        };

        var ex = await Assert.ThrowsAsync<ArgumentException>(() =>
            _leaveService.SubmitLeaveRequestAsync(null, dto));

        Assert.Contains("active employee", ex.Message);
    }

    [Theory]
    [InlineData("Maternity")]
    [InlineData("InvalidType")]
    [InlineData("")]
    public async Task SubmitLeaveRequest_WithInvalidLeaveType_ThrowsArgumentException(string invalidType)
    {
        var dto = new CreateLeaveRequestDto
        {
            LeaveType = invalidType,
            StartDate = DateTime.UtcNow.AddDays(1),
            EndDate = DateTime.UtcNow.AddDays(2),
            Reason = "Personal"
        };

        var ex = await Assert.ThrowsAsync<ArgumentException>(() =>
            _leaveService.SubmitLeaveRequestAsync(1, dto));

        Assert.Contains("Invalid LeaveType", ex.Message);
    }

    [Fact]
    public async Task SubmitLeaveRequest_WhenStartDateIsAfterEndDate_ThrowsArgumentException()
    {
        var dto = new CreateLeaveRequestDto
        {
            LeaveType = "Sick",
            StartDate = DateTime.UtcNow.AddDays(5),
            EndDate = DateTime.UtcNow.AddDays(2),
            Reason = "Doctor visit"
        };

        var ex = await Assert.ThrowsAsync<ArgumentException>(() =>
            _leaveService.SubmitLeaveRequestAsync(1, dto));

        Assert.Contains("Start date cannot be after end date", ex.Message);
    }

    [Fact]
    public async Task SubmitLeaveRequest_WhenStartDateIsInPast_ThrowsArgumentException()
    {
        var dto = new CreateLeaveRequestDto
        {
            LeaveType = "Casual",
            StartDate = DateTime.UtcNow.AddDays(-2),
            EndDate = DateTime.UtcNow.AddDays(1),
            Reason = "Retrospective leave"
        };

        var ex = await Assert.ThrowsAsync<ArgumentException>(() =>
            _leaveService.SubmitLeaveRequestAsync(1, dto));

        Assert.Contains("past dates", ex.Message);
    }

    [Fact]
    public async Task SubmitLeaveRequest_WhenInsufficientBalance_ThrowsInvalidOperationException()
    {
        var empId = 5;
        var dto = new CreateLeaveRequestDto
        {
            LeaveType = "Casual",
            StartDate = DateTime.UtcNow.AddDays(2),
            EndDate = DateTime.UtcNow.AddDays(10), // 9 days requested
            Reason = "Vacation"
        };

        _mockLeaveRepo.Setup(r => r.GetLeaveBalanceAsync(empId))
            .ReturnsAsync(new LeaveBalanceDto { TotalLeaves = 20, UsedLeaves = 18, RemainingLeaves = 2 });

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _leaveService.SubmitLeaveRequestAsync(empId, dto));

        Assert.Contains("Insufficient leave balance", ex.Message);
    }

    [Fact]
    public async Task SubmitLeaveRequest_WhenOverlappingLeaveExists_ThrowsInvalidOperationException()
    {
        var empId = 5;
        var start = DateTime.UtcNow.AddDays(2).Date;
        var end = DateTime.UtcNow.AddDays(4).Date;
        var dto = new CreateLeaveRequestDto
        {
            LeaveType = "Earned",
            StartDate = start,
            EndDate = end,
            Reason = "Break"
        };

        _mockLeaveRepo.Setup(r => r.GetLeaveBalanceAsync(empId))
            .ReturnsAsync(new LeaveBalanceDto { TotalLeaves = 20, UsedLeaves = 0, RemainingLeaves = 20 });
        _mockLeaveRepo.Setup(r => r.HasOverlappingLeaveAsync(empId, start, end))
            .ReturnsAsync(true);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _leaveService.SubmitLeaveRequestAsync(empId, dto));

        Assert.Contains("overlapping", ex.Message);
    }

    [Fact]
    public async Task SubmitLeaveRequest_WithValidData_ReturnsCreatedResponse()
    {
        var empId = 5;
        var start = DateTime.UtcNow.AddDays(2).Date;
        var end = DateTime.UtcNow.AddDays(3).Date;
        var dto = new CreateLeaveRequestDto
        {
            LeaveType = "Casual",
            StartDate = start,
            EndDate = end,
            Reason = "Family function"
        };

        _mockLeaveRepo.Setup(r => r.GetLeaveBalanceAsync(empId))
            .ReturnsAsync(new LeaveBalanceDto { TotalLeaves = 20, UsedLeaves = 5, RemainingLeaves = 15 });
        _mockLeaveRepo.Setup(r => r.HasOverlappingLeaveAsync(empId, start, end))
            .ReturnsAsync(false);

        var expectedResponse = new LeaveRequestResponseDto
        {
            LeaveID = 10,
            EmployeeID = empId,
            EmployeeName = "Bob Smith",
            LeaveType = "Casual",
            StartDate = start,
            EndDate = end,
            Reason = "Family function",
            Status = "Pending"
        };

        _mockLeaveRepo.Setup(r => r.CreateLeaveRequestAsync(It.IsAny<LeaveRequest>()))
            .ReturnsAsync(expectedResponse);

        var result = await _leaveService.SubmitLeaveRequestAsync(empId, dto);

        Assert.NotNull(result);
        Assert.Equal(10, result.LeaveID);
        Assert.Equal("Pending", result.Status);
    }

    [Fact]
    public async Task ApproveLeave_WhenManagerIsNotDirectManager_ThrowsUnauthorizedAccessException()
    {
        var leaveId = 1;
        var employee = new EmployeeResponseDto { EmployeeID = 2, ManagerID = 99 };
        var request = new LeaveRequest { LeaveID = leaveId, EmployeeID = 2, Status = "Pending" };

        _mockLeaveRepo.Setup(r => r.GetLeaveRequestEntityByIdAsync(leaveId))
            .ReturnsAsync(request);
        _mockEmpRepo.Setup(r => r.GetEmployeeByIdAsync(2))
            .ReturnsAsync(employee);

        var ex = await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            _leaveService.ApproveLeaveAsync(leaveId, "Manager", managerEmployeeId: 44));

        Assert.Contains("direct reports", ex.Message);
    }

    [Fact]
    public async Task ApproveLeave_WhenDirectManagerApproves_Succeeds()
    {
        var leaveId = 1;
        var start = DateTime.UtcNow.AddDays(2).Date;
        var end = DateTime.UtcNow.AddDays(3).Date;
        var employee = new EmployeeResponseDto { EmployeeID = 2, ManagerID = 10 };
        var request = new LeaveRequest
        {
            LeaveID = leaveId,
            EmployeeID = 2,
            StartDate = start,
            EndDate = end,
            Days = 2,
            Status = "Pending"
        };

        _mockLeaveRepo.Setup(r => r.GetLeaveRequestEntityByIdAsync(leaveId))
            .ReturnsAsync(request);
        _mockEmpRepo.Setup(r => r.GetEmployeeByIdAsync(2))
            .ReturnsAsync(employee);
        _mockLeaveRepo.Setup(r => r.GetLeaveBalanceAsync(2))
            .ReturnsAsync(new LeaveBalanceDto { TotalLeaves = 20, UsedLeaves = 2, RemainingLeaves = 18 });
        _mockLeaveRepo.Setup(r => r.ApproveLeaveTransactionAsync(leaveId, 2, 10, 2))
            .ReturnsAsync(true);

        var result = await _leaveService.ApproveLeaveAsync(leaveId, "Manager", managerEmployeeId: 10);

        Assert.True(result);
        _mockLeaveRepo.Verify(r => r.ApproveLeaveTransactionAsync(leaveId, 2, 10, 2), Times.Once);
    }

    [Fact]
    public async Task ApproveLeave_WhenAlreadyApproved_ThrowsInvalidOperationException()
    {
        var leaveId = 1;
        var request = new LeaveRequest { LeaveID = leaveId, EmployeeID = 2, Status = "Approved" };

        _mockLeaveRepo.Setup(r => r.GetLeaveRequestEntityByIdAsync(leaveId))
            .ReturnsAsync(request);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _leaveService.ApproveLeaveAsync(leaveId, "Admin", null));

        Assert.Contains("Cannot approve request with status 'Approved'", ex.Message);
    }
}
