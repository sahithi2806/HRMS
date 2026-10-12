using System.Security.Claims;
using System.Threading.Tasks;
using HrmsApi.DTOs;
using HrmsApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HrmsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AssetsController : ControllerBase
{
    private readonly IAssetService _assetService;

    public AssetsController(IAssetService assetService)
    {
        _assetService = assetService;
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

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAllAssets([FromQuery] string? status = null, [FromQuery] string? category = null)
    {
        var assets = await _assetService.GetAllAssetsAsync(status, category);
        return Ok(assets);
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAssetById(int id)
    {
        var asset = await _assetService.GetAssetByIdAsync(id);
        return Ok(asset);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateAsset([FromBody] CreateAssetDto dto)
    {
        var created = await _assetService.CreateAssetAsync(dto);
        return CreatedAtAction(nameof(GetAssetById), new { id = created.AssetID }, created);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateAsset(int id, [FromBody] UpdateAssetDto dto)
    {
        await _assetService.UpdateAssetAsync(id, dto);
        return Ok(new { message = "Asset updated successfully." });
    }

    [HttpPatch("{id}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateAssetStatus(int id, [FromBody] UpdateAssetStatusDto dto)
    {
        await _assetService.UpdateAssetStatusAsync(id, dto.Status);
        return Ok(new { message = "Asset status updated." });
    }

    [HttpPost("{id}/assign")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AssignAsset(int id, [FromBody] AssignAssetDto dto)
    {
        var ctx = GetUserContext();
        if (!ctx.EmployeeId.HasValue) return Forbid();

        await _assetService.AssignAssetAsync(id, dto.EmployeeID, ctx.EmployeeId.Value);
        return Ok(new { message = "Asset assigned successfully." });
    }

    [HttpPost("{id}/unassign")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UnassignAsset(int id)
    {
        await _assetService.UnassignAssetAsync(id);
        return Ok(new { message = "Asset unassigned and returned to Available inventory." });
    }

    [HttpGet("mine")]
    public async Task<IActionResult> GetMyAssets()
    {
        var ctx = GetUserContext();
        if (!ctx.EmployeeId.HasValue) return Forbid();

        var assets = await _assetService.GetMyAssetsAsync(ctx.EmployeeId.Value);
        return Ok(assets);
    }

    [HttpPost("requests")]
    public async Task<IActionResult> CreateAssetRequest([FromBody] CreateAssetRequestDto dto)
    {
        var ctx = GetUserContext();
        if (!ctx.EmployeeId.HasValue) return Forbid();

        var created = await _assetService.CreateRequestAsync(ctx.EmployeeId.Value, dto);
        return Ok(created);
    }

    [HttpGet("requests")]
    public async Task<IActionResult> GetAssetRequests()
    {
        var ctx = GetUserContext();
        if (!ctx.EmployeeId.HasValue) return Forbid();

        var requests = await _assetService.GetRequestsAsync(ctx.Role, ctx.EmployeeId.Value);
        return Ok(requests);
    }

    [HttpPut("requests/{id}/approve")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ApproveAssetRequest(int id, [FromBody] ReviewAssetRequestDto? dto)
    {
        var ctx = GetUserContext();
        if (!ctx.EmployeeId.HasValue) return Forbid();

        await _assetService.ApproveRequestAsync(id, ctx.EmployeeId.Value, dto);
        return Ok(new { message = "Asset request approved successfully." });
    }

    [HttpPut("requests/{id}/reject")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> RejectAssetRequest(int id, [FromBody] ReviewAssetRequestDto? dto)
    {
        var ctx = GetUserContext();
        if (!ctx.EmployeeId.HasValue) return Forbid();

        await _assetService.RejectRequestAsync(id, ctx.EmployeeId.Value, dto);
        return Ok(new { message = "Asset request rejected." });
    }

    [HttpPut("requests/{id}/cancel")]
    public async Task<IActionResult> CancelAssetRequest(int id)
    {
        var ctx = GetUserContext();
        if (!ctx.EmployeeId.HasValue) return Forbid();

        await _assetService.CancelRequestAsync(id, ctx.EmployeeId.Value);
        return Ok(new { message = "Asset request cancelled." });
    }
}
