using System.Security.Claims;
using HrmsApi.DTOs;
using HrmsApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HrmsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EmployeesController : ControllerBase
{
    private readonly IEmployeeService _employeeService;

    public EmployeesController(IEmployeeService employeeService)
    {
        _employeeService = employeeService;
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
    public async Task<IActionResult> GetEmployees(
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] string? department = null)
    {
        var ctx = GetUserContext();
        var employees = await _employeeService.GetEmployeesAsync(ctx.Role, ctx.UserId, ctx.EmployeeId, search, status, department);
        return Ok(employees);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetEmployeeById(int id)
    {
        var ctx = GetUserContext();
        var employee = await _employeeService.GetEmployeeByIdAsync(id, ctx.Role, ctx.EmployeeId);
        if (employee == null)
        {
            return NotFound(new { message = $"Employee with ID {id} not found." });
        }
        return Ok(employee);
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMyProfile()
    {
        var ctx = GetUserContext();
        var profile = await _employeeService.GetMyProfileAsync(ctx.UserId);
        if (profile == null)
        {
            return NotFound(new { message = "Profile not found." });
        }
        return Ok(profile);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateEmployee([FromBody] CreateEmployeeDto dto)
    {
        var created = await _employeeService.CreateEmployeeAsync(dto);
        return CreatedAtAction(nameof(GetEmployeeById), new { id = created.EmployeeID }, created);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateEmployee(int id, [FromBody] UpdateEmployeeDto dto)
    {
        var success = await _employeeService.UpdateEmployeeAsync(id, dto);
        if (!success)
        {
            return NotFound(new { message = $"Employee with ID {id} not found." });
        }
        return Ok(new { message = "Employee updated successfully." });
    }

    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateEmployeeStatus(int id, [FromBody] UpdateEmployeeStatusDto dto)
    {
        var success = await _employeeService.UpdateEmployeeStatusAsync(id, dto.Status, dto.ExitReason);
        if (!success)
        {
            return NotFound(new { message = $"Employee with ID {id} not found." });
        }
        return Ok(new { message = $"Employee status updated to {dto.Status}." });
    }
}
