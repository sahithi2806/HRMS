using HrmsApi.DTOs;
using HrmsApi.Models;

namespace HrmsApi.Repositories;

public interface IEmployeeRepository
{
    Task<IEnumerable<EmployeeResponseDto>> GetAllEmployeesAsync(string? search = null, string? status = null, string? department = null);
    Task<IEnumerable<EmployeeResponseDto>> GetDirectReportsAsync(int managerEmployeeId);
    Task<EmployeeResponseDto?> GetEmployeeByIdAsync(int employeeId);
    Task<EmployeeResponseDto?> GetEmployeeByUserIdAsync(int userId);
    Task<EmployeeResponseDto> CreateEmployeeWithUserAndBalanceAsync(User user, Employee employee, int totalLeaves);
    Task<bool> UpdateEmployeeAsync(int employeeId, UpdateEmployeeDto dto);
    Task<bool> UpdateEmployeeStatusAsync(int employeeId, string status);
    Task<bool> IsEmailInUseAsync(string email, int? excludeUserId = null);
    Task<bool> ExistsAsync(int employeeId);
}
