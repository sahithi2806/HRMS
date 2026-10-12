using HrmsApi.DTOs;
using HrmsApi.Models;

namespace HrmsApi.Repositories;

public interface ILeaveRepository
{
    Task<IEnumerable<LeaveRequestResponseDto>> GetLeaveRequestsForEmployeeAsync(int employeeId, string? status = null);
    Task<IEnumerable<LeaveRequestResponseDto>> GetLeaveRequestsForManagerAsync(int managerEmployeeId, string? status = null);
    Task<IEnumerable<LeaveRequestResponseDto>> GetAllLeaveRequestsAdminAsync(string? status = null);
    Task<LeaveRequest?> GetLeaveRequestEntityByIdAsync(int leaveId);
    Task<LeaveRequestResponseDto?> GetLeaveRequestByIdAsync(int leaveId);
    Task<LeaveBalanceDto?> GetLeaveBalanceAsync(int employeeId);
    Task<int> GetPendingLeaveDaysForEmployeeAsync(int employeeId);
    Task<LeaveRequestResponseDto> CreateLeaveRequestAsync(LeaveRequest request);
    Task<bool> HasOverlappingLeaveAsync(int employeeId, DateTime startDate, DateTime endDate, int? excludeLeaveId = null);
    Task<bool> ApproveLeaveTransactionAsync(int leaveId, int employeeId, int approverEmployeeId, int daysToDeduct, string? comment = null);
    Task<bool> RejectLeaveRequestAsync(int leaveId, int approverEmployeeId, string? comment = null);
    Task<IEnumerable<LeaveRequestResponseDto>> GetLeaveCalendarAsync(string startMonth, string endMonth, int? managerEmployeeId = null);
}
