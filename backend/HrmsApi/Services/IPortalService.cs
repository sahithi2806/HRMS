using System.Threading.Tasks;
using HrmsApi.DTOs;

namespace HrmsApi.Services;

public interface IPortalService
{
    Task<PortalSummaryDto> GetSummaryAsync(int employeeId, string role);
}
