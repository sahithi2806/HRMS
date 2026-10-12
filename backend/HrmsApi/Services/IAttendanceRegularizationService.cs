using System.Collections.Generic;
using System.Threading.Tasks;
using HrmsApi.DTOs;

namespace HrmsApi.Services;

public interface IAttendanceRegularizationService
{
    Task<RegularizationDto> CreateRegularizationAsync(int employeeId, CreateRegularizationDto dto);
    Task<IEnumerable<RegularizationDto>> GetRegularizationsAsync(int employeeId, string role);
    Task<bool> ApproveRegularizationAsync(int regularizationId, int reviewerEmployeeId, string reviewerRole, ReviewRegularizationDto? dto);
    Task<bool> RejectRegularizationAsync(int regularizationId, int reviewerEmployeeId, string reviewerRole, ReviewRegularizationDto? dto);
    Task<bool> CancelRegularizationAsync(int regularizationId, int employeeId);
}
