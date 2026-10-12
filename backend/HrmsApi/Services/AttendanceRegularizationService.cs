using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HrmsApi.DTOs;
using HrmsApi.Helpers;
using HrmsApi.Models;
using HrmsApi.Repositories;
using Microsoft.Extensions.Configuration;

namespace HrmsApi.Services;

public class AttendanceRegularizationService : IAttendanceRegularizationService
{
    private readonly IAttendanceRegularizationRepository _regularizationRepository;
    private readonly IAttendanceRepository _attendanceRepository;
    private readonly IEmployeeRepository _employeeRepository;
    private readonly IConfiguration _configuration;

    public AttendanceRegularizationService(
        IAttendanceRegularizationRepository regularizationRepository,
        IAttendanceRepository attendanceRepository,
        IEmployeeRepository employeeRepository,
        IConfiguration configuration)
    {
        _regularizationRepository = regularizationRepository;
        _attendanceRepository = attendanceRepository;
        _employeeRepository = employeeRepository;
        _configuration = configuration;
    }

    private TimeZoneInfo GetTimeZone()
    {
        var tzId = _configuration["Attendance:TimeZone"] ?? "Asia/Kolkata";
        return AttendanceCalculator.ResolveTimeZone(tzId);
    }

    public async Task<RegularizationDto> CreateRegularizationAsync(int employeeId, CreateRegularizationDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.WorkDate) || !DateOnly.TryParse(dto.WorkDate, out var workDate))
        {
            throw new ArgumentException("Invalid WorkDate format.");
        }

        var tz = GetTimeZone();
        var localNow = AttendanceCalculator.ToLocalTime(DateTime.UtcNow, tz);
        var today = DateOnly.FromDateTime(localNow);

        int windowDays = 7;
        if (int.TryParse(_configuration["Attendance:RegularizationWindowDays"], out var w))
        {
            windowDays = w;
        }

        if (!AttendanceCalculator.IsWithinRegularizationWindow(workDate, today, windowDays))
        {
            throw new ArgumentException($"Regularization can only be requested for dates within the past {windowDays} days.");
        }

        if (dto.RequestedCheckIn >= dto.RequestedCheckOut)
        {
            throw new ArgumentException("Requested Check-in must be earlier than Check-out.");
        }

        if (string.IsNullOrWhiteSpace(dto.Reason))
        {
            throw new ArgumentException("Reason is required.");
        }

        var reg = new AttendanceRegularization
        {
            EmployeeID = employeeId,
            WorkDate = dto.WorkDate,
            RequestedCheckIn = dto.RequestedCheckIn,
            RequestedCheckOut = dto.RequestedCheckOut,
            Reason = dto.Reason.Trim(),
            Status = "Pending"
        };

        var id = await _regularizationRepository.CreateAsync(reg);
        var created = await _regularizationRepository.GetByIdAsync(id);

        var employee = await _employeeRepository.GetEmployeeByIdAsync(employeeId);
        return new RegularizationDto
        {
            RegularizationID = id,
            EmployeeID = employeeId,
            EmployeeName = employee?.Name ?? string.Empty,
            Department = employee?.Department ?? string.Empty,
            WorkDate = reg.WorkDate,
            RequestedCheckIn = reg.RequestedCheckIn,
            RequestedCheckOut = reg.RequestedCheckOut,
            Reason = reg.Reason,
            Status = reg.Status,
            CreatedAt = created?.CreatedAt ?? DateTime.UtcNow
        };
    }

    public async Task<IEnumerable<RegularizationDto>> GetRegularizationsAsync(int employeeId, string role)
    {
        if (role == "Admin")
        {
            return await _regularizationRepository.GetAllAsync();
        }
        else if (role == "Manager")
        {
            var reports = (await _regularizationRepository.GetPendingForManagerAsync(employeeId)).ToList();
            var own = (await _regularizationRepository.GetByEmployeeAsync(employeeId)).ToList();
            return reports.Concat(own.Where(o => !reports.Any(r => r.RegularizationID == o.RegularizationID)))
                          .OrderByDescending(r => r.CreatedAt);
        }
        else
        {
            return await _regularizationRepository.GetByEmployeeAsync(employeeId);
        }
    }

    public async Task<bool> ApproveRegularizationAsync(int regularizationId, int reviewerEmployeeId, string reviewerRole, ReviewRegularizationDto? dto)
    {
        var reg = await _regularizationRepository.GetByIdAsync(regularizationId)
            ?? throw new KeyNotFoundException("Regularization request not found.");

        if (reg.Status != "Pending")
        {
            throw new InvalidOperationException($"Cannot approve request with status '{reg.Status}'.");
        }

        var employee = await _employeeRepository.GetEmployeeByIdAsync(reg.EmployeeID)
            ?? throw new KeyNotFoundException("Employee not found.");

        // Enforce Decision #1 shared approval rules via pure ApprovalPolicy
        ApprovalPolicy.ValidateCanApproveOrReject(reg.EmployeeID, employee.ManagerID, reviewerEmployeeId, reviewerRole);

        // Update regularization record
        var updated = await _regularizationRepository.UpdateStatusAsync(regularizationId, "Approved", reviewerEmployeeId, dto?.Comment);
        if (!updated)
        {
            throw new ConflictException("Request was already reviewed.");
        }

        // Apply to Attendance table atomically
        var status = AttendanceCalculator.ComputeStatus(reg.RequestedCheckIn, reg.RequestedCheckOut);
        var isLate = AttendanceCalculator.IsLate(reg.RequestedCheckIn.TimeOfDay);

        await _attendanceRepository.UpsertRegularizedAttendanceAsync(
            reg.EmployeeID,
            reg.WorkDate,
            reg.RequestedCheckIn,
            reg.RequestedCheckOut,
            isLate,
            status);

        return true;
    }

    public async Task<bool> RejectRegularizationAsync(int regularizationId, int reviewerEmployeeId, string reviewerRole, ReviewRegularizationDto? dto)
    {
        var reg = await _regularizationRepository.GetByIdAsync(regularizationId)
            ?? throw new KeyNotFoundException("Regularization request not found.");

        if (reg.Status != "Pending")
        {
            throw new InvalidOperationException($"Cannot reject request with status '{reg.Status}'.");
        }

        var employee = await _employeeRepository.GetEmployeeByIdAsync(reg.EmployeeID)
            ?? throw new KeyNotFoundException("Employee not found.");

        // Enforce Decision #1 shared approval rules via pure ApprovalPolicy
        ApprovalPolicy.ValidateCanApproveOrReject(reg.EmployeeID, employee.ManagerID, reviewerEmployeeId, reviewerRole);

        var updated = await _regularizationRepository.UpdateStatusAsync(regularizationId, "Rejected", reviewerEmployeeId, dto?.Comment);
        if (!updated)
        {
            throw new ConflictException("Request was already reviewed.");
        }

        return true;
    }

    public async Task<bool> CancelRegularizationAsync(int regularizationId, int employeeId)
    {
        var reg = await _regularizationRepository.GetByIdAsync(regularizationId)
            ?? throw new KeyNotFoundException("Regularization request not found.");

        if (reg.EmployeeID != employeeId)
        {
            throw new UnauthorizedAccessException("You can only cancel your own regularization request.");
        }

        if (reg.Status != "Pending")
        {
            throw new InvalidOperationException($"Cannot cancel request with status '{reg.Status}'.");
        }

        var cancelled = await _regularizationRepository.CancelAsync(regularizationId, employeeId);
        if (!cancelled)
        {
            throw new ConflictException("Could not cancel request. It may have already been reviewed.");
        }

        return true;
    }
}
