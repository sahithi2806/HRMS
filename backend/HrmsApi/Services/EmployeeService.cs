using HrmsApi.DTOs;
using HrmsApi.Helpers;
using HrmsApi.Models;
using HrmsApi.Repositories;

namespace HrmsApi.Services;

public class EmployeeService : IEmployeeService
{
    private readonly IEmployeeRepository _employeeRepository;

    public EmployeeService(IEmployeeRepository employeeRepository)
    {
        _employeeRepository = employeeRepository;
    }

    public async Task<IEnumerable<EmployeeResponseDto>> GetEmployeesAsync(string userRole, int currentUserId, int? currentEmployeeId, string? search = null, string? status = null, string? department = null)
    {
        if (userRole == "Admin")
        {
            return await _employeeRepository.GetAllEmployeesAsync(search, status, department);
        }

        if (userRole == "Manager" && currentEmployeeId.HasValue)
        {
            return await _employeeRepository.GetDirectReportsAsync(currentEmployeeId.Value);
        }

        // Employee role can only view their own record
        var self = await _employeeRepository.GetEmployeeByUserIdAsync(currentUserId);
        return self != null ? new[] { self } : Enumerable.Empty<EmployeeResponseDto>();
    }

    public async Task<EmployeeResponseDto?> GetEmployeeByIdAsync(int employeeId, string userRole, int? currentEmployeeId)
    {
        var employee = await _employeeRepository.GetEmployeeByIdAsync(employeeId);
        if (employee == null) return null;

        // Role authorization check
        if (userRole == "Admin")
        {
            return employee;
        }

        if (userRole == "Manager")
        {
            // Manager can view self or their direct reports
            if (employee.EmployeeID == currentEmployeeId || employee.ManagerID == currentEmployeeId)
            {
                return employee;
            }
            throw new UnauthorizedAccessException("You are only authorized to view your own profile or direct reports.");
        }

        if (employee.EmployeeID == currentEmployeeId)
        {
            return employee;
        }

        throw new UnauthorizedAccessException("You are only authorized to view your own profile.");
    }

    public async Task<EmployeeResponseDto?> GetMyProfileAsync(int currentUserId)
    {
        return await _employeeRepository.GetEmployeeByUserIdAsync(currentUserId);
    }

    public async Task<EmployeeResponseDto> CreateEmployeeAsync(CreateEmployeeDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            throw new ArgumentException("Name is required.");
        if (string.IsNullOrWhiteSpace(dto.Email))
            throw new ArgumentException("Email is required.");
        if (string.IsNullOrWhiteSpace(dto.Password) || dto.Password.Length < 6)
            throw new ArgumentException("Password must be at least 6 characters.");
        if (dto.Salary < 0)
            throw new ArgumentException("Salary cannot be negative.");

        var normalizedEmail = dto.Email.Trim().ToLower();
        var emailExists = await _employeeRepository.IsEmailInUseAsync(normalizedEmail);
        if (emailExists)
        {
            throw new InvalidOperationException($"Email '{dto.Email}' is already in use.");
        }

        if (dto.ManagerID.HasValue)
        {
            var managerExists = await _employeeRepository.ExistsAsync(dto.ManagerID.Value);
            if (!managerExists)
            {
                throw new ArgumentException("Selected manager does not exist.");
            }
        }

        var user = new User
        {
            Name = dto.Name.Trim(),
            Email = normalizedEmail,
            PasswordHash = PasswordHasher.HashPassword(dto.Password),
            Role = string.IsNullOrWhiteSpace(dto.Role) ? "Employee" : dto.Role.Trim()
        };

        var employee = new Employee
        {
            Department = dto.Department.Trim(),
            Position = dto.Position.Trim(),
            JoiningDate = dto.JoiningDate == default ? DateTime.UtcNow.Date : dto.JoiningDate.Date,
            Salary = dto.Salary,
            Status = "Active",
            ManagerID = dto.ManagerID
        };

        var totalLeaves = dto.TotalLeaves > 0 ? dto.TotalLeaves : 20;

        return await _employeeRepository.CreateEmployeeWithUserAndBalanceAsync(user, employee, totalLeaves);
    }

    public async Task<bool> UpdateEmployeeAsync(int employeeId, UpdateEmployeeDto dto)
    {
        var existing = await _employeeRepository.GetEmployeeByIdAsync(employeeId)
            ?? throw new KeyNotFoundException("Employee not found.");

        if (dto.Salary < 0)
            throw new ArgumentException("Salary cannot be negative.");

        if (dto.ManagerID.HasValue)
        {
            if (dto.ManagerID.Value == employeeId)
                throw new ArgumentException("An employee cannot be their own manager.");

            var managerExists = await _employeeRepository.ExistsAsync(dto.ManagerID.Value);
            if (!managerExists)
                throw new ArgumentException("Selected manager does not exist.");
        }

        return await _employeeRepository.UpdateEmployeeAsync(employeeId, dto);
    }

    public async Task<bool> UpdateEmployeeStatusAsync(int employeeId, string status)
    {
        if (status != "Active" && status != "Inactive")
        {
            throw new ArgumentException("Status must be either 'Active' or 'Inactive'.");
        }

        var exists = await _employeeRepository.ExistsAsync(employeeId);
        if (!exists) throw new KeyNotFoundException("Employee not found.");

        return await _employeeRepository.UpdateEmployeeStatusAsync(employeeId, status);
    }
}
