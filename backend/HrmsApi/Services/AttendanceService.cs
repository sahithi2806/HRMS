using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using HrmsApi.DTOs;
using HrmsApi.Helpers;
using HrmsApi.Repositories;
using Microsoft.Extensions.Configuration;

namespace HrmsApi.Services;

public class AttendanceService : IAttendanceService
{
    private readonly IAttendanceRepository _attendanceRepository;
    private readonly ILeaveRepository _leaveRepository;
    private readonly IConfiguration _configuration;

    public AttendanceService(
        IAttendanceRepository attendanceRepository,
        ILeaveRepository leaveRepository,
        IConfiguration configuration)
    {
        _attendanceRepository = attendanceRepository;
        _leaveRepository = leaveRepository;
        _configuration = configuration;
    }

    private TimeZoneInfo GetTimeZone()
    {
        var tzId = _configuration["Attendance:TimeZone"] ?? "Asia/Kolkata";
        return AttendanceCalculator.ResolveTimeZone(tzId);
    }

    public async Task<TodayAttendanceDto> CheckInAsync(int employeeId)
    {
        var tz = GetTimeZone();
        var localNow = AttendanceCalculator.ToLocalTime(DateTime.UtcNow, tz);
        var workDate = AttendanceCalculator.GetWorkDate(localNow);
        var workDateStr = workDate.ToString("yyyy-MM-dd");

        if (AttendanceCalculator.IsWeekend(workDate))
        {
            throw new ArgumentException("Check-in is not permitted on weekends.");
        }

        // Check if on approved leave
        var leaves = await _leaveRepository.GetLeaveRequestsForEmployeeAsync(employeeId, "Approved");
        var onLeave = leaves.Any(l => DateOnly.FromDateTime(l.StartDate) <= workDate && DateOnly.FromDateTime(l.EndDate) >= workDate);
        if (onLeave)
        {
            throw new ConflictException("Cannot check in on an approved leave day.");
        }

        // Check if already checked in
        var existing = await _attendanceRepository.GetByEmployeeAndDateAsync(employeeId, workDateStr);
        if (existing != null)
        {
            throw new ConflictException("Already checked in for today.");
        }

        var isLate = AttendanceCalculator.IsLate(localNow.TimeOfDay);
        await _attendanceRepository.CheckInAsync(employeeId, workDateStr, DateTime.UtcNow, isLate, "Self");

        return await GetTodayAsync(employeeId);
    }

    public async Task<TodayAttendanceDto> CheckOutAsync(int employeeId)
    {
        var tz = GetTimeZone();
        var localNow = AttendanceCalculator.ToLocalTime(DateTime.UtcNow, tz);
        var workDate = AttendanceCalculator.GetWorkDate(localNow);
        var workDateStr = workDate.ToString("yyyy-MM-dd");

        var existing = await _attendanceRepository.GetByEmployeeAndDateAsync(employeeId, workDateStr);
        if (existing == null)
        {
            throw new ConflictException("Cannot check out without checking in first.");
        }

        if (existing.CheckOutAt != null)
        {
            throw new ConflictException("Already checked out for today.");
        }

        var status = AttendanceCalculator.ComputeStatus(existing.CheckInAt, DateTime.UtcNow);
        var updated = await _attendanceRepository.CheckOutAsync(employeeId, workDateStr, DateTime.UtcNow, status);
        if (!updated)
        {
            throw new ConflictException("Check-out failed or already completed.");
        }

        return await GetTodayAsync(employeeId);
    }

    public async Task<TodayAttendanceDto> GetTodayAsync(int employeeId)
    {
        var tz = GetTimeZone();
        var localNow = AttendanceCalculator.ToLocalTime(DateTime.UtcNow, tz);
        var workDate = AttendanceCalculator.GetWorkDate(localNow);
        var workDateStr = workDate.ToString("yyyy-MM-dd");

        var isWeekend = AttendanceCalculator.IsWeekend(workDate);
        var leaves = await _leaveRepository.GetLeaveRequestsForEmployeeAsync(employeeId, "Approved");
        var onLeave = leaves.FirstOrDefault(l => DateOnly.FromDateTime(l.StartDate) <= workDate && DateOnly.FromDateTime(l.EndDate) >= workDate);

        var existing = await _attendanceRepository.GetByEmployeeAndDateAsync(employeeId, workDateStr);

        var today = DateOnly.FromDateTime(localNow);
        DateTime? checkIn = existing?.CheckInAt;
        DateTime? checkOut = existing?.CheckOutAt;
        bool isLate = existing?.IsLate ?? false;
        string? storedStatus = existing?.Status;

        var state = AttendanceCalculator.DeriveDayStatus(workDate, today, isWeekend, onLeave != null, checkIn, checkOut, storedStatus);

        double totalHours = 0.0;
        if (checkIn.HasValue && checkOut.HasValue)
        {
            totalHours = Math.Round(Math.Max(0, (checkOut.Value - checkIn.Value).TotalHours), 1);
        }
        else if (checkIn.HasValue)
        {
            var diff = (DateTime.UtcNow - checkIn.Value).TotalHours;
            if (diff < 0)
            {
                diff = (localNow - checkIn.Value).TotalHours;
            }
            totalHours = Math.Round(Math.Max(0, diff), 1);
        }

        return new TodayAttendanceDto
        {
            WorkDate = workDateStr,
            State = state,
            CheckInAt = checkIn,
            CheckOutAt = checkOut,
            IsLate = isLate,
            Status = storedStatus ?? (state == "CheckedIn" ? "Present" : state),
            TotalHours = totalHours,
            CanCheckIn = !isWeekend && onLeave == null && checkIn == null,
            CanCheckOut = checkIn != null && checkOut == null,
            Message = onLeave != null ? $"On {onLeave.LeaveType} Leave" : null
        };
    }

    public async Task<MonthlyAttendanceSummaryDto> GetMyMonthlyAsync(int employeeId, string? month)
    {
        var tz = GetTimeZone();
        var localNow = AttendanceCalculator.ToLocalTime(DateTime.UtcNow, tz);

        int year = localNow.Year;
        int monthNum = localNow.Month;

        if (!string.IsNullOrWhiteSpace(month) && DateTime.TryParseExact(month, "yyyy-MM", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
        {
            year = parsed.Year;
            monthNum = parsed.Month;
        }

        var daysInMonth = DateTime.DaysInMonth(year, monthNum);
        var startDateStr = $"{year:D4}-{monthNum:D2}-01";
        var endDateStr = $"{year:D4}-{monthNum:D2}-{daysInMonth:D2}";

        var records = (await _attendanceRepository.GetMonthlyRecordsAsync(employeeId, startDateStr, endDateStr))
            .ToDictionary(r => r.WorkDate);

        var leaves = await _leaveRepository.GetLeaveRequestsForEmployeeAsync(employeeId, "Approved");

        var today = DateOnly.FromDateTime(localNow);
        var summary = new MonthlyAttendanceSummaryDto
        {
            Month = $"{year:D4}-{monthNum:D2}",
            TotalDaysInMonth = daysInMonth
        };

        for (int day = 1; day <= daysInMonth; day++)
        {
            var dateOnly = new DateOnly(year, monthNum, day);
            var dateStr = dateOnly.ToString("yyyy-MM-dd");
            var isWeekend = AttendanceCalculator.IsWeekend(dateOnly);

            var leaveMatch = leaves.FirstOrDefault(l => DateOnly.FromDateTime(l.StartDate) <= dateOnly && DateOnly.FromDateTime(l.EndDate) >= dateOnly);
            records.TryGetValue(dateStr, out var rec);

            DateTime? checkIn = rec?.CheckInAt;
            DateTime? checkOut = rec?.CheckOutAt;
            bool isLate = rec?.IsLate ?? false;
            string? storedStatus = rec?.Status;

            var status = AttendanceCalculator.DeriveDayStatus(dateOnly, today, isWeekend, leaveMatch != null, checkIn, checkOut, storedStatus);

            double hours = 0.0;
            if (checkIn.HasValue && checkOut.HasValue)
            {
                hours = Math.Round((checkOut.Value - checkIn.Value).TotalHours, 1);
            }

            if (!isWeekend)
            {
                summary.WorkingDays++;
            }

            if (status == "Present")
            {
                summary.PresentDays++;
                if (isLate) summary.LateDays++;
            }
            else if (status == "HalfDay")
            {
                summary.HalfDays++;
                if (isLate) summary.LateDays++;
            }
            else if (status == "Absent" || status == "MissingCheckOut")
            {
                summary.AbsentDays++;
            }
            else if (status == "OnLeave")
            {
                summary.LeaveDays++;
            }

            bool canRegularize = AttendanceCalculator.IsWithinRegularizationWindow(dateOnly, today) &&
                                 (status == "Absent" || status == "HalfDay" || status == "MissingCheckOut" || isLate);

            summary.Days.Add(new AttendanceCalendarDayDto
            {
                Date = dateStr,
                DayOfWeek = dateOnly.DayOfWeek.ToString(),
                Status = status,
                CheckInAt = checkIn,
                CheckOutAt = checkOut,
                IsLate = isLate,
                TotalHours = hours,
                CanRegularize = canRegularize,
                LeaveType = leaveMatch?.LeaveType
            });
        }

        return summary;
    }

    public async Task<IEnumerable<TeamAttendanceDto>> GetTeamAttendanceAsync(int employeeId, string role, string? date)
    {
        if (role != "Admin" && role != "Manager")
        {
            throw new UnauthorizedAccessException("Only managers and admins can view team attendance.");
        }

        var tz = GetTimeZone();
        var localNow = AttendanceCalculator.ToLocalTime(DateTime.UtcNow, tz);
        string workDateStr = string.IsNullOrWhiteSpace(date)
            ? AttendanceCalculator.GetWorkDate(localNow).ToString("yyyy-MM-dd")
            : date;

        bool isAdmin = role == "Admin";
        int? managerId = isAdmin ? null : employeeId;

        var team = (await _attendanceRepository.GetTeamAttendanceAsync(managerId, workDateStr, isAdmin)).ToList();

        // Calculate hours for checked-out or active check-ins
        foreach (var item in team)
        {
            if (item.CheckInAt.HasValue && item.CheckOutAt.HasValue)
            {
                item.TotalHours = Math.Round(Math.Max(0, (item.CheckOutAt.Value - item.CheckInAt.Value).TotalHours), 1);
            }
            else if (item.CheckInAt.HasValue)
            {
                var diff = (DateTime.UtcNow - item.CheckInAt.Value).TotalHours;
                if (diff < 0)
                {
                    diff = (localNow - item.CheckInAt.Value).TotalHours;
                }
                item.TotalHours = Math.Round(Math.Max(0, diff), 1);
            }
        }

        return team;
    }
}
