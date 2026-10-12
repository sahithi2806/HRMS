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
public class TicketsController : ControllerBase
{
    private readonly ITicketService _ticketService;

    public TicketsController(ITicketService ticketService)
    {
        _ticketService = ticketService;
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
    public async Task<IActionResult> GetTickets(
        [FromQuery] string? status = null,
        [FromQuery] string? priority = null,
        [FromQuery] string? category = null)
    {
        var ctx = GetUserContext();
        if (!ctx.EmployeeId.HasValue) return Forbid();

        var tickets = await _ticketService.GetTicketsAsync(ctx.Role, ctx.EmployeeId.Value, status, priority, category);
        return Ok(tickets);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTicketById(int id)
    {
        var ctx = GetUserContext();
        if (!ctx.EmployeeId.HasValue) return Forbid();

        var ticket = await _ticketService.GetTicketByIdAsync(id, ctx.Role, ctx.EmployeeId.Value);
        return Ok(ticket);
    }

    [HttpPost]
    public async Task<IActionResult> CreateTicket([FromBody] CreateTicketDto dto)
    {
        var ctx = GetUserContext();
        if (!ctx.EmployeeId.HasValue) return Forbid();

        var created = await _ticketService.CreateTicketAsync(ctx.EmployeeId.Value, dto);
        return CreatedAtAction(nameof(GetTicketById), new { id = created.TicketID }, created);
    }

    [HttpPost("{id}/comments")]
    public async Task<IActionResult> AddComment(int id, [FromBody] CreateCommentDto dto)
    {
        var ctx = GetUserContext();
        if (!ctx.EmployeeId.HasValue) return Forbid();

        var comment = await _ticketService.AddCommentAsync(id, ctx.EmployeeId.Value, ctx.Role, dto);
        return Ok(comment);
    }

    [HttpPatch("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateTicket(int id, [FromBody] UpdateTicketDto dto)
    {
        var ctx = GetUserContext();
        await _ticketService.UpdateTicketAsync(id, ctx.Role, dto);
        return Ok(new { message = "Ticket updated successfully." });
    }

    [HttpPut("{id}/close")]
    public async Task<IActionResult> CloseTicket(int id)
    {
        var ctx = GetUserContext();
        if (!ctx.EmployeeId.HasValue) return Forbid();

        await _ticketService.CloseTicketAsync(id, ctx.Role, ctx.EmployeeId.Value);
        return Ok(new { message = "Ticket closed successfully." });
    }

    [HttpPut("{id}/reopen")]
    public async Task<IActionResult> ReopenTicket(int id)
    {
        var ctx = GetUserContext();
        if (!ctx.EmployeeId.HasValue) return Forbid();

        await _ticketService.ReopenTicketAsync(id, ctx.Role, ctx.EmployeeId.Value);
        return Ok(new { message = "Ticket reopened successfully." });
    }

    [HttpPost("{id}/feedback")]
    public async Task<IActionResult> SubmitFeedback(int id, [FromBody] TicketFeedbackDto dto)
    {
        var ctx = GetUserContext();
        if (!ctx.EmployeeId.HasValue) return Forbid();

        await _ticketService.SubmitFeedbackAsync(id, ctx.EmployeeId.Value, dto);
        return Ok(new { message = "Thank you for providing ticket feedback." });
    }
}
