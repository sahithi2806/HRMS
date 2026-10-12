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
public class AttendanceController : ControllerBase
{
    private readonly IAttendanceService _attendanceService;
    private readonly IAttendanceRegularizationService _regularizationService;

    public AttendanceController(
        IAttendanceService attendanceService,
        IAttendanceRegularizationService regularizationService)
    {
        _attendanceService = attendanceService;
        _regularizationService = regularizationService;
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

    [HttpPost("check-in")]
    public async Task<IActionResult> CheckIn()
    {
        var ctx = GetUserContext();
        if (!ctx.EmployeeId.HasValue)
        {
            return Forbid();
        }

        var result = await _attendanceService.CheckInAsync(ctx.EmployeeId.Value);
        return Ok(result);
    }

    [HttpPost("check-out")]
    public async Task<IActionResult> CheckOut()
    {
        var ctx = GetUserContext();
        if (!ctx.EmployeeId.HasValue)
        {
            return Forbid();
        }

        var result = await _attendanceService.CheckOutAsync(ctx.EmployeeId.Value);
        return Ok(result);
    }

    [HttpGet("today")]
    public async Task<IActionResult> GetToday()
    {
        var ctx = GetUserContext();
        if (!ctx.EmployeeId.HasValue)
        {
            return Forbid();
        }

        var result = await _attendanceService.GetTodayAsync(ctx.EmployeeId.Value);
        return Ok(result);
    }

    [HttpGet("my")]
    public async Task<IActionResult> GetMyAttendance([FromQuery] string? month = null)
    {
        var ctx = GetUserContext();
        if (!ctx.EmployeeId.HasValue)
        {
            return Forbid();
        }

        var result = await _attendanceService.GetMyMonthlyAsync(ctx.EmployeeId.Value, month);
        return Ok(result);
    }

    [HttpGet("team")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetTeamAttendance([FromQuery] string? date = null)
    {
        var ctx = GetUserContext();
        if (!ctx.EmployeeId.HasValue)
        {
            return Forbid();
        }

        var result = await _attendanceService.GetTeamAttendanceAsync(ctx.EmployeeId.Value, ctx.Role, date);
        return Ok(result);
    }

    [HttpPost("regularizations")]
    public async Task<IActionResult> CreateRegularization([FromBody] CreateRegularizationDto dto)
    {
        var ctx = GetUserContext();
        if (!ctx.EmployeeId.HasValue)
        {
            return Forbid();
        }

        var created = await _regularizationService.CreateRegularizationAsync(ctx.EmployeeId.Value, dto);
        return CreatedAtAction(nameof(GetRegularizations), new { id = created.RegularizationID }, created);
    }

    [HttpGet("regularizations")]
    public async Task<IActionResult> GetRegularizations()
    {
        var ctx = GetUserContext();
        if (!ctx.EmployeeId.HasValue)
        {
            return Forbid();
        }

        var list = await _regularizationService.GetRegularizationsAsync(ctx.EmployeeId.Value, ctx.Role);
        return Ok(list);
    }

    [HttpPut("regularizations/{id}/approve")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> ApproveRegularization(int id, [FromBody] ReviewRegularizationDto? dto)
    {
        var ctx = GetUserContext();
        if (!ctx.EmployeeId.HasValue)
        {
            return Forbid();
        }

        await _regularizationService.ApproveRegularizationAsync(id, ctx.EmployeeId.Value, ctx.Role, dto);
        return Ok(new { message = "Regularization approved successfully." });
    }

    [HttpPut("regularizations/{id}/reject")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> RejectRegularization(int id, [FromBody] ReviewRegularizationDto? dto)
    {
        var ctx = GetUserContext();
        if (!ctx.EmployeeId.HasValue)
        {
            return Forbid();
        }

        await _regularizationService.RejectRegularizationAsync(id, ctx.EmployeeId.Value, ctx.Role, dto);
        return Ok(new { message = "Regularization rejected successfully." });
    }

    [HttpPut("regularizations/{id}/cancel")]
    public async Task<IActionResult> CancelRegularization(int id)
    {
        var ctx = GetUserContext();
        if (!ctx.EmployeeId.HasValue)
        {
            return Forbid();
        }

        await _regularizationService.CancelRegularizationAsync(id, ctx.EmployeeId.Value);
        return Ok(new { message = "Regularization cancelled successfully." });
    }
}
