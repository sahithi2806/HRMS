using System.Security.Claims;
using HrmsApi.DTOs;
using HrmsApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HrmsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LeaveController : ControllerBase
{
    private readonly ILeaveService _leaveService;

    public LeaveController(ILeaveService leaveService)
    {
        _leaveService = leaveService;
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
    public async Task<IActionResult> GetLeaveRequests([FromQuery] string? status = null)
    {
        var ctx = GetUserContext();
        var requests = await _leaveService.GetLeaveRequestsAsync(ctx.Role, ctx.EmployeeId, status);
        return Ok(requests);
    }

    [HttpGet("calendar")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetLeaveCalendar([FromQuery] string? month = null)
    {
        var ctx = GetUserContext();
        var leaves = await _leaveService.GetLeaveCalendarAsync(ctx.Role, ctx.EmployeeId, month);
        return Ok(leaves);
    }

    [HttpGet("balance")]
    public async Task<IActionResult> GetLeaveBalance()
    {
        var ctx = GetUserContext();
        var balance = await _leaveService.GetLeaveBalanceAsync(ctx.EmployeeId);
        if (balance == null)
        {
            return NotFound(new { message = "Leave balance record not found." });
        }
        return Ok(balance);
    }

    [HttpPost]
    public async Task<IActionResult> ApplyForLeave([FromBody] CreateLeaveRequestDto dto)
    {
        var ctx = GetUserContext();
        var created = await _leaveService.SubmitLeaveRequestAsync(ctx.EmployeeId, dto);
        return CreatedAtAction(nameof(GetLeaveRequests), new { id = created.LeaveID }, created);
    }

    [HttpPut("{id:int}/approve")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> ApproveLeave(int id, [FromBody] LeaveActionDto? dto = null)
    {
        var ctx = GetUserContext();
        var success = await _leaveService.ApproveLeaveAsync(id, ctx.Role, ctx.EmployeeId, dto?.Comment);
        if (!success)
        {
            return BadRequest(new { message = "Failed to approve leave request." });
        }
        return Ok(new { message = "Leave request approved successfully and balance updated." });
    }

    [HttpPut("{id:int}/reject")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> RejectLeave(int id, [FromBody] LeaveActionDto? dto = null)
    {
        var ctx = GetUserContext();
        var success = await _leaveService.RejectLeaveAsync(id, ctx.Role, ctx.EmployeeId, dto?.Comment);
        if (!success)
        {
            return BadRequest(new { message = "Failed to reject leave request." });
        }
        return Ok(new { message = "Leave request rejected." });
    }
}
