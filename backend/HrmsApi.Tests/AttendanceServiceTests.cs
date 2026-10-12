using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using HrmsApi.DTOs;
using HrmsApi.Helpers;
using HrmsApi.Models;
using HrmsApi.Repositories;
using HrmsApi.Services;
using Microsoft.Extensions.Configuration;
using Moq;
using Xunit;

namespace HrmsApi.Tests;

public class AttendanceServiceTests
{
    private readonly Mock<IAttendanceRepository> _attendanceRepoMock = new();
    private readonly Mock<ILeaveRepository> _leaveRepoMock = new();
    private readonly Mock<IConfiguration> _configMock = new();
    private readonly AttendanceService _service;

    public AttendanceServiceTests()
    {
        _configMock.Setup(c => c["Attendance:TimeZone"]).Returns("Asia/Kolkata");
        _service = new AttendanceService(_attendanceRepoMock.Object, _leaveRepoMock.Object, _configMock.Object);
    }

    [Fact]
    public async Task CheckIn_ThrowsConflict_WhenAlreadyCheckedInToday()
    {
        int employeeId = 8;
        _leaveRepoMock.Setup(r => r.GetLeaveRequestsForEmployeeAsync(employeeId, "Approved"))
            .ReturnsAsync(new List<LeaveRequestResponseDto>());

        _attendanceRepoMock.Setup(r => r.GetByEmployeeAndDateAsync(employeeId, It.IsAny<string>()))
            .ReturnsAsync(new Attendance
            {
                AttendanceID = 1,
                EmployeeID = employeeId,
                WorkDate = "2026-10-12",
                CheckInAt = DateTime.UtcNow
            });

        await Assert.ThrowsAsync<ConflictException>(() => _service.CheckInAsync(employeeId));
    }

    [Fact]
    public async Task CheckIn_ThrowsConflict_WhenEmployeeHasApprovedLeaveToday()
    {
        int employeeId = 8;
        _leaveRepoMock.Setup(r => r.GetLeaveRequestsForEmployeeAsync(employeeId, "Approved"))
            .ReturnsAsync(new List<LeaveRequestResponseDto>
            {
                new()
                {
                    LeaveID = 1,
                    EmployeeID = employeeId,
                    StartDate = DateTime.UtcNow.AddDays(-1),
                    EndDate = DateTime.UtcNow.AddDays(1),
                    Status = "Approved"
                }
            });

        await Assert.ThrowsAsync<ConflictException>(() => _service.CheckInAsync(employeeId));
    }

    [Fact]
    public async Task CheckOut_ThrowsConflict_WhenNotCheckedInFirst()
    {
        int employeeId = 8;
        _attendanceRepoMock.Setup(r => r.GetByEmployeeAndDateAsync(employeeId, It.IsAny<string>()))
            .ReturnsAsync((Attendance?)null);

        await Assert.ThrowsAsync<ConflictException>(() => _service.CheckOutAsync(employeeId));
    }

    [Fact]
    public async Task CheckOut_ThrowsConflict_WhenAlreadyCheckedOutToday()
    {
        int employeeId = 8;
        _attendanceRepoMock.Setup(r => r.GetByEmployeeAndDateAsync(employeeId, It.IsAny<string>()))
            .ReturnsAsync(new Attendance
            {
                AttendanceID = 1,
                EmployeeID = employeeId,
                WorkDate = "2026-10-12",
                CheckInAt = DateTime.UtcNow.AddHours(-8),
                CheckOutAt = DateTime.UtcNow
            });

        await Assert.ThrowsAsync<ConflictException>(() => _service.CheckOutAsync(employeeId));
    }
}
