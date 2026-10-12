using System.Collections.Generic;
using System.Threading.Tasks;
using HrmsApi.DTOs;
using HrmsApi.Models;

namespace HrmsApi.Repositories;

public interface IAttendanceRegularizationRepository
{
    Task<AttendanceRegularization?> GetByIdAsync(int regularizationId);
    Task<IEnumerable<RegularizationDto>> GetByEmployeeAsync(int employeeId);
    Task<IEnumerable<RegularizationDto>> GetPendingForManagerAsync(int managerId);
    Task<IEnumerable<RegularizationDto>> GetAllAsync();
    Task<int> CreateAsync(AttendanceRegularization regularization);
    Task<bool> UpdateStatusAsync(int regularizationId, string status, int approverId, string? comment);
    Task<bool> CancelAsync(int regularizationId, int employeeId);
}
