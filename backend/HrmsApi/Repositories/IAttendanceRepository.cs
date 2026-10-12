using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using HrmsApi.DTOs;
using HrmsApi.Models;

namespace HrmsApi.Repositories;

public interface IAttendanceRepository
{
    Task<Attendance?> GetByEmployeeAndDateAsync(int employeeId, string workDate);
    Task<int> CheckInAsync(int employeeId, string workDate, DateTime checkInAt, bool isLate, string source);
    Task<bool> CheckOutAsync(int employeeId, string workDate, DateTime checkOutAt, string status);
    Task<IEnumerable<Attendance>> GetMonthlyRecordsAsync(int employeeId, string startMonthDate, string endMonthDate);
    Task<IEnumerable<TeamAttendanceDto>> GetTeamAttendanceAsync(int? managerId, string workDate, bool isAdmin);
    Task<bool> UpsertRegularizedAttendanceAsync(int employeeId, string workDate, DateTime checkInAt, DateTime checkOutAt, bool isLate, string status);
}
