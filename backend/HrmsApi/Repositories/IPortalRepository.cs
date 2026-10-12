using System.Threading.Tasks;
using HrmsApi.DTOs;

namespace HrmsApi.Repositories;

public interface IPortalRepository
{
    Task<PortalSummaryDto> GetPortalSummaryAsync(int employeeId, string role, string workDate);
}
