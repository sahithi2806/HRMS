using HrmsApi.DTOs;

namespace HrmsApi.Services;

public interface IEmployeeService
{
    Task<IEnumerable<EmployeeResponseDto>> GetEmployeesAsync(string userRole, int currentUserId, int? currentEmployeeId, string? search = null, string? status = null, string? department = null);
    Task<EmployeeResponseDto?> GetEmployeeByIdAsync(int employeeId, string userRole, int? currentEmployeeId);
    Task<EmployeeResponseDto?> GetMyProfileAsync(int currentUserId);
    Task<EmployeeResponseDto> CreateEmployeeAsync(CreateEmployeeDto dto);
    Task<bool> UpdateEmployeeAsync(int employeeId, UpdateEmployeeDto dto);
    Task<bool> UpdateEmployeeStatusAsync(int employeeId, string status);
}
