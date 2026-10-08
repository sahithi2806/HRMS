using HrmsApi.DTOs;

namespace HrmsApi.Services;

public interface ILeaveService
{
    Task<IEnumerable<LeaveRequestResponseDto>> GetLeaveRequestsAsync(string userRole, int? currentEmployeeId, string? status = null);
    Task<LeaveBalanceDto?> GetLeaveBalanceAsync(int? currentEmployeeId);
    Task<LeaveRequestResponseDto> SubmitLeaveRequestAsync(int? currentEmployeeId, CreateLeaveRequestDto dto);
    Task<bool> ApproveLeaveAsync(int leaveId, string userRole, int? managerEmployeeId);
    Task<bool> RejectLeaveAsync(int leaveId, string userRole, int? managerEmployeeId);
}
