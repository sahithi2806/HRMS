using System;
using System.Threading.Tasks;
using HrmsApi.DTOs;
using HrmsApi.Models;
using HrmsApi.Repositories;
using HrmsApi.Services;
using Microsoft.Extensions.Configuration;
using Moq;
using Xunit;

namespace HrmsApi.Tests;

public class AttendanceRegularizationServiceTests
{
    private readonly Mock<IAttendanceRegularizationRepository> _regRepoMock = new();
    private readonly Mock<IAttendanceRepository> _attRepoMock = new();
    private readonly Mock<IEmployeeRepository> _empRepoMock = new();
    private readonly Mock<IConfiguration> _configMock = new();
    private readonly AttendanceRegularizationService _service;

    public AttendanceRegularizationServiceTests()
    {
        _configMock.Setup(c => c["Attendance:TimeZone"]).Returns("Asia/Kolkata");
        _configMock.Setup(c => c["Attendance:RegularizationWindowDays"]).Returns("7");

        _service = new AttendanceRegularizationService(
            _regRepoMock.Object,
            _attRepoMock.Object,
            _empRepoMock.Object,
            _configMock.Object);
    }

    [Fact]
    public async Task CreateRegularization_Throws_WhenOutside7DayWindow()
    {
        int employeeId = 8;
        var dto = new CreateRegularizationDto
        {
            WorkDate = DateTime.UtcNow.AddDays(-10).ToString("yyyy-MM-dd"), // 10 days ago
            RequestedCheckIn = DateTime.UtcNow.AddDays(-10).Date.AddHours(9.5),
            RequestedCheckOut = DateTime.UtcNow.AddDays(-10).Date.AddHours(18.5),
            Reason = "Missed punch"
        };

        await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateRegularizationAsync(employeeId, dto));
    }

    [Fact]
    public async Task ApproveRegularization_Succeeds_WhenDirectManagerApproves()
    {
        int regId = 1;
        int employeeId = 8;
        int managerEmployeeId = 2;

        var reg = new AttendanceRegularization
        {
            RegularizationID = regId,
            EmployeeID = employeeId,
            WorkDate = "2026-10-08",
            RequestedCheckIn = new DateTime(2026, 10, 8, 9, 30, 0),
            RequestedCheckOut = new DateTime(2026, 10, 8, 18, 30, 0),
            Reason = "Biometric turnstile issue",
            Status = "Pending"
        };

        var emp = new EmployeeResponseDto
        {
            EmployeeID = employeeId,
            ManagerID = managerEmployeeId,
            Status = "Active"
        };

        _regRepoMock.Setup(r => r.GetByIdAsync(regId)).ReturnsAsync(reg);
        _empRepoMock.Setup(r => r.GetEmployeeByIdAsync(employeeId)).ReturnsAsync(emp);
        _regRepoMock.Setup(r => r.UpdateStatusAsync(regId, "Approved", managerEmployeeId, It.IsAny<string>()))
            .ReturnsAsync(true);
        _attRepoMock.Setup(r => r.UpsertRegularizedAttendanceAsync(
            employeeId, "2026-10-08", reg.RequestedCheckIn, reg.RequestedCheckOut, false, "Present"))
            .ReturnsAsync(true);

        var result = await _service.ApproveRegularizationAsync(regId, managerEmployeeId, "Manager", new ReviewRegularizationDto { Comment = "Approved" });

        Assert.True(result);
        _attRepoMock.Verify(r => r.UpsertRegularizedAttendanceAsync(
            employeeId, "2026-10-08", reg.RequestedCheckIn, reg.RequestedCheckOut, false, "Present"), Times.Once);
    }

    [Fact]
    public async Task ApproveRegularization_Throws_OnSelfApproval()
    {
        int regId = 1;
        int employeeId = 2; // Manager themselves
        var reg = new AttendanceRegularization
        {
            RegularizationID = regId,
            EmployeeID = employeeId,
            WorkDate = "2026-10-08",
            RequestedCheckIn = new DateTime(2026, 10, 8, 9, 30, 0),
            RequestedCheckOut = new DateTime(2026, 10, 8, 18, 30, 0),
            Status = "Pending"
        };

        var emp = new EmployeeResponseDto
        {
            EmployeeID = employeeId,
            ManagerID = 1,
            Status = "Active"
        };

        _regRepoMock.Setup(r => r.GetByIdAsync(regId)).ReturnsAsync(reg);
        _empRepoMock.Setup(r => r.GetEmployeeByIdAsync(employeeId)).ReturnsAsync(emp);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            _service.ApproveRegularizationAsync(regId, employeeId, "Manager", null));
    }

    [Fact]
    public async Task ApproveRegularization_Throws_WhenNonManagerAttemptsToApprove()
    {
        int regId = 1;
        int employeeId = 8;
        int unrelatedManagerId = 4; // Different manager

        var reg = new AttendanceRegularization
        {
            RegularizationID = regId,
            EmployeeID = employeeId,
            WorkDate = "2026-10-08",
            RequestedCheckIn = new DateTime(2026, 10, 8, 9, 30, 0),
            RequestedCheckOut = new DateTime(2026, 10, 8, 18, 30, 0),
            Status = "Pending"
        };

        var emp = new EmployeeResponseDto
        {
            EmployeeID = employeeId,
            ManagerID = 2, // Direct manager is 2
            Status = "Active"
        };

        _regRepoMock.Setup(r => r.GetByIdAsync(regId)).ReturnsAsync(reg);
        _empRepoMock.Setup(r => r.GetEmployeeByIdAsync(employeeId)).ReturnsAsync(emp);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            _service.ApproveRegularizationAsync(regId, unrelatedManagerId, "Manager", null));
    }
}
