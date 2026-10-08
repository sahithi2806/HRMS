using HrmsApi.DTOs;
using HrmsApi.Models;

namespace HrmsApi.Repositories;

public interface ILeaveRepository
{
    Task<IEnumerable<LeaveRequestResponseDto>> GetLeaveRequestsForEmployeeAsync(int employeeId);
    Task<IEnumerable<LeaveRequestResponseDto>> GetLeaveRequestsForManagerAsync(int managerEmployeeId);
    Task<IEnumerable<LeaveRequestResponseDto>> GetAllLeaveRequestsAdminAsync(string? status = null);
    Task<LeaveRequest?> GetLeaveRequestEntityByIdAsync(int leaveId);
    Task<LeaveRequestResponseDto?> GetLeaveRequestByIdAsync(int leaveId);
    Task<LeaveBalanceDto?> GetLeaveBalanceAsync(int employeeId);
    Task<LeaveRequestResponseDto> CreateLeaveRequestAsync(LeaveRequest request);
    Task<bool> HasOverlappingLeaveAsync(int employeeId, DateTime startDate, DateTime endDate, int? excludeLeaveId = null);
    Task<bool> ApproveLeaveTransactionAsync(int leaveId, int employeeId, int managerEmployeeId, int daysToDeduct);
    Task<bool> RejectLeaveRequestAsync(int leaveId, int managerEmployeeId);
}
