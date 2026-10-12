using System;
using HrmsApi.Helpers;
using Xunit;

namespace HrmsApi.Tests;

public class AttendanceCalculatorTests
{
    [Fact]
    public void IsWeekend_ReturnsTrue_ForSaturdayAndSunday()
    {
        var sat = new DateOnly(2026, 10, 10); // Saturday
        var sun = new DateOnly(2026, 10, 11); // Sunday
        var mon = new DateOnly(2026, 10, 12); // Monday

        Assert.True(AttendanceCalculator.IsWeekend(sat));
        Assert.True(AttendanceCalculator.IsWeekend(sun));
        Assert.False(AttendanceCalculator.IsWeekend(mon));
    }

    [Theory]
    [InlineData(9, 15, false)] // 09:15 - on time
    [InlineData(9, 30, false)] // 09:30 - shift start
    [InlineData(9, 45, false)] // 09:45 - grace limit
    [InlineData(9, 46, true)]  // 09:46 - late
    [InlineData(10, 0, true)]  // 10:00 - late
    public void IsLate_DetectsLateCheckIn_Accurately(int hour, int minute, bool expectedLate)
    {
        var time = new TimeSpan(hour, minute, 0);
        var result = AttendanceCalculator.IsLate(time);
        Assert.Equal(expectedLate, result);
    }

    [Fact]
    public void ComputeStatus_ReturnsPresent_WhenWorked8HoursOrMore()
    {
        var checkIn = new DateTime(2026, 10, 12, 9, 30, 0);
        var checkOut8h = new DateTime(2026, 10, 12, 17, 30, 0);
        var checkOut9h = new DateTime(2026, 10, 12, 18, 30, 0);

        Assert.Equal("Present", AttendanceCalculator.ComputeStatus(checkIn, checkOut8h));
        Assert.Equal("Present", AttendanceCalculator.ComputeStatus(checkIn, checkOut9h));
    }

    [Fact]
    public void ComputeStatus_ReturnsHalfDay_WhenWorkedBetween4And8Hours()
    {
        var checkIn = new DateTime(2026, 10, 12, 9, 30, 0);
        var checkOut4h = new DateTime(2026, 10, 12, 13, 30, 0);
        var checkOut7h59m = new DateTime(2026, 10, 12, 17, 29, 0);

        Assert.Equal("HalfDay", AttendanceCalculator.ComputeStatus(checkIn, checkOut4h));
        Assert.Equal("HalfDay", AttendanceCalculator.ComputeStatus(checkIn, checkOut7h59m));
    }

    [Fact]
    public void ComputeStatus_ReturnsAbsent_WhenWorkedLessThan4Hours()
    {
        var checkIn = new DateTime(2026, 10, 12, 9, 30, 0);
        var checkOut3h59m = new DateTime(2026, 10, 12, 13, 29, 0);
        var checkOut2h = new DateTime(2026, 10, 12, 11, 30, 0);

        Assert.Equal("Absent", AttendanceCalculator.ComputeStatus(checkIn, checkOut3h59m));
        Assert.Equal("Absent", AttendanceCalculator.ComputeStatus(checkIn, checkOut2h));
    }

    [Fact]
    public void DeriveDayStatus_ReturnsMissingCheckOut_ForPastDayWithoutCheckOut()
    {
        var pastDate = new DateOnly(2026, 10, 5);
        var today = new DateOnly(2026, 10, 12);
        var checkIn = new DateTime(2026, 10, 5, 9, 30, 0);

        var status = AttendanceCalculator.DeriveDayStatus(pastDate, today, false, false, checkIn, null, null);
        Assert.Equal("MissingCheckOut", status);
    }

    [Fact]
    public void DeriveDayStatus_ReturnsOnLeave_WhenEmployeeHasApprovedLeave()
    {
        var date = new DateOnly(2026, 10, 12);
        var today = new DateOnly(2026, 10, 12);

        var status = AttendanceCalculator.DeriveDayStatus(date, today, false, true, null, null, null);
        Assert.Equal("OnLeave", status);
    }

    [Fact]
    public void IsWithinRegularizationWindow_Respects7DayLimit()
    {
        var today = new DateOnly(2026, 10, 12);

        Assert.True(AttendanceCalculator.IsWithinRegularizationWindow(new DateOnly(2026, 10, 12), today));
        Assert.True(AttendanceCalculator.IsWithinRegularizationWindow(new DateOnly(2026, 10, 5), today));
        Assert.False(AttendanceCalculator.IsWithinRegularizationWindow(new DateOnly(2026, 10, 4), today));
        Assert.False(AttendanceCalculator.IsWithinRegularizationWindow(new DateOnly(2026, 10, 13), today)); // Future
    }
}
