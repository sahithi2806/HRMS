using HrmsApi.Helpers;
using Xunit;

namespace HrmsApi.Tests;

public class BusinessDaysTests
{
    [Fact]
    public void Calculate_SameWeekMondayToFriday_ReturnsFiveDays()
    {
        var start = new DateTime(2026, 10, 12); // Monday
        var end = new DateTime(2026, 10, 16);   // Friday

        var result = BusinessDays.Calculate(start, end);

        Assert.Equal(5, result);
    }

    [Fact]
    public void Calculate_WeekendSpanningFridayToMonday_ReturnsTwoDays()
    {
        var start = new DateTime(2026, 10, 16); // Friday
        var end = new DateTime(2026, 10, 19);   // Monday

        var result = BusinessDays.Calculate(start, end);

        Assert.Equal(2, result);
    }

    [Fact]
    public void Calculate_EntirelyOnWeekend_ReturnsZero()
    {
        var start = new DateTime(2026, 10, 17); // Saturday
        var end = new DateTime(2026, 10, 18);   // Sunday

        var result = BusinessDays.Calculate(start, end);

        Assert.Equal(0, result);
    }

    [Fact]
    public void Calculate_SingleWeekday_ReturnsOne()
    {
        var date = new DateTime(2026, 10, 14); // Wednesday

        var result = BusinessDays.Calculate(date, date);

        Assert.Equal(1, result);
    }

    [Fact]
    public void Calculate_EndDateBeforeStartDate_ReturnsZero()
    {
        var start = new DateTime(2026, 10, 20);
        var end = new DateTime(2026, 10, 15);

        var result = BusinessDays.Calculate(start, end);

        Assert.Equal(0, result);
    }
}
