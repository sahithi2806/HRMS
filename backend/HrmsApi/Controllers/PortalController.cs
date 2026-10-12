using System.Security.Claims;
using System.Threading.Tasks;
using HrmsApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HrmsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PortalController : ControllerBase
{
    private readonly IPortalService _portalService;

    public PortalController(IPortalService portalService)
    {
        _portalService = portalService;
    }

    private (int UserId, string Role, int? EmployeeId) GetUserContext()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("Role")?.Value ?? "Employee";
        var empIdStr = User.FindFirst("EmployeeID")?.Value;

        int.TryParse(userIdStr, out var userId);
        int? empId = int.TryParse(empIdStr, out var parsedEmpId) ? parsedEmpId : null;

        return (userId, role, empId);
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var ctx = GetUserContext();
        if (!ctx.EmployeeId.HasValue)
        {
            return Forbid();
        }

        var summary = await _portalService.GetSummaryAsync(ctx.EmployeeId.Value, ctx.Role);
        return Ok(summary);
    }
}
