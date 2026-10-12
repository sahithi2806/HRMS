using System;

namespace HrmsApi.Helpers;

public static class AttendanceCalculator
{
    public static readonly TimeSpan DefaultShiftStart = new(9, 30, 0); // 09:30
    public const int DefaultGraceMinutes = 15; // 09:45 cutoff

    public static TimeZoneInfo ResolveTimeZone(string? timeZoneId = "Asia/Kolkata")
    {
        if (string.IsNullOrWhiteSpace(timeZoneId))
        {
            timeZoneId = "Asia/Kolkata";
        }

        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        }
        catch
        {
            // Fallback for Windows system timezone ID
            if (timeZoneId.Equals("Asia/Kolkata", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    return TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");
                }
                catch
                {
                    // Fallback to UTC+5:30 custom if not found
                    return TimeZoneInfo.CreateCustomTimeZone("IST", TimeSpan.FromHours(5.5), "India Standard Time", "India Standard Time");
                }
            }

            return TimeZoneInfo.Utc;
        }
    }

    public static DateTime ToLocalTime(DateTime utcTime, TimeZoneInfo timeZone)
    {
        var utc = utcTime.Kind == DateTimeKind.Utc ? utcTime : DateTime.SpecifyKind(utcTime, DateTimeKind.Utc);
        return TimeZoneInfo.ConvertTimeFromUtc(utc, timeZone);
    }

    public static DateOnly GetWorkDate(DateTime localTime)
    {
        return DateOnly.FromDateTime(localTime.Date);
    }

    public static bool IsWeekend(DateOnly workDate)
    {
        var dow = workDate.DayOfWeek;
        return dow == DayOfWeek.Saturday || dow == DayOfWeek.Sunday;
    }

    public static bool IsLate(TimeSpan checkInTimeOfDay, TimeSpan? shiftStart = null, int graceMinutes = DefaultGraceMinutes)
    {
        var start = shiftStart ?? DefaultShiftStart;
        var threshold = start.Add(TimeSpan.FromMinutes(graceMinutes));
        return checkInTimeOfDay > threshold;
    }

    public static string ComputeStatus(DateTime checkIn, DateTime? checkOut)
    {
        if (!checkOut.HasValue)
        {
            return "Present"; // Checked in today, ongoing
        }

        var duration = checkOut.Value - checkIn;
        if (duration < TimeSpan.Zero)
        {
            return "Absent";
        }

        if (duration.TotalHours >= 8.0)
        {
            return "Present";
        }

        if (duration.TotalHours >= 4.0)
        {
            return "HalfDay";
        }

        return "Absent";
    }

    public static string DeriveDayStatus(DateOnly workDate, DateOnly today, bool isWeekend, bool hasApprovedLeave, DateTime? checkIn, DateTime? checkOut, string? storedStatus)
    {
        if (hasApprovedLeave)
        {
            return "OnLeave";
        }

        if (isWeekend)
        {
            return "Weekend";
        }

        if (checkIn.HasValue)
        {
            if (checkOut.HasValue)
            {
                return storedStatus ?? ComputeStatus(checkIn.Value, checkOut.Value);
            }

            if (workDate < today)
            {
                return "MissingCheckOut";
            }

            return "CheckedIn";
        }

        if (workDate < today)
        {
            return "Absent";
        }

        return "NotCheckedIn";
    }

    public static bool IsWithinRegularizationWindow(DateOnly workDate, DateOnly today, int windowDays = 7)
    {
        if (workDate > today)
        {
            return false;
        }

        var minAllowed = today.AddDays(-windowDays);
        return workDate >= minAllowed;
    }
}
