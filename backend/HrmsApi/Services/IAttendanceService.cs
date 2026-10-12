using System.Collections.Generic;
using System.Threading.Tasks;
using HrmsApi.DTOs;

namespace HrmsApi.Services;

public interface IAttendanceService
{
    Task<TodayAttendanceDto> CheckInAsync(int employeeId);
    Task<TodayAttendanceDto> CheckOutAsync(int employeeId);
    Task<TodayAttendanceDto> GetTodayAsync(int employeeId);
    Task<MonthlyAttendanceSummaryDto> GetMyMonthlyAsync(int employeeId, string? month);
    Task<IEnumerable<TeamAttendanceDto>> GetTeamAttendanceAsync(int employeeId, string role, string? date);
}
