namespace HrmsApi.Helpers;

public static class BusinessDays
{
    /// <summary>
    /// Calculates the number of business days (Monday through Friday inclusive)
    /// between startDate and endDate.
    /// Returns 0 if endDate is before startDate.
    /// </summary>
    public static int Calculate(DateTime startDate, DateTime endDate)
    {
        var start = startDate.Date;
        var end = endDate.Date;

        if (end < start)
        {
            return 0;
        }

        int count = 0;
        for (var current = start; current <= end; current = current.AddDays(1))
        {
            if (current.DayOfWeek != DayOfWeek.Saturday && current.DayOfWeek != DayOfWeek.Sunday)
            {
                count++;
            }
        }

        return count;
    }

    public static int Calculate(DateOnly startDate, DateOnly endDate)
    {
        return Calculate(startDate.ToDateTime(TimeOnly.MinValue), endDate.ToDateTime(TimeOnly.MinValue));
    }
}
