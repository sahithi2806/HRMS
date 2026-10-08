using HrmsApi.DTOs;
using HrmsApi.Models;
using HrmsApi.Repositories;

namespace HrmsApi.Services;

public class LeaveService : ILeaveService
{
    private readonly ILeaveRepository _leaveRepository;
    private readonly IEmployeeRepository _employeeRepository;

    private static readonly HashSet<string> AllowedLeaveTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "Casual", "Sick", "Earned"
    };

    public LeaveService(ILeaveRepository leaveRepository, IEmployeeRepository employeeRepository)
    {
        _leaveRepository = leaveRepository;
        _employeeRepository = employeeRepository;
    }

    public async Task<IEnumerable<LeaveRequestResponseDto>> GetLeaveRequestsAsync(string userRole, int? currentEmployeeId, string? status = null)
    {
        if (userRole == "Admin")
        {
            return await _leaveRepository.GetAllLeaveRequestsAdminAsync(status);
        }

        if (userRole == "Manager" && currentEmployeeId.HasValue)
        {
            return await _leaveRepository.GetLeaveRequestsForManagerAsync(currentEmployeeId.Value);
        }

        if (currentEmployeeId.HasValue)
        {
            return await _leaveRepository.GetLeaveRequestsForEmployeeAsync(currentEmployeeId.Value);
        }

        return Enumerable.Empty<LeaveRequestResponseDto>();
    }

    public async Task<LeaveBalanceDto?> GetLeaveBalanceAsync(int? currentEmployeeId)
    {
        if (!currentEmployeeId.HasValue)
        {
            throw new ArgumentException("No associated employee profile found for user.");
        }

        return await _leaveRepository.GetLeaveBalanceAsync(currentEmployeeId.Value);
    }

    public async Task<LeaveRequestResponseDto> SubmitLeaveRequestAsync(int? currentEmployeeId, CreateLeaveRequestDto dto)
    {
        if (!currentEmployeeId.HasValue)
        {
            throw new ArgumentException("You must be an active employee to apply for leave.");
        }

        var empId = currentEmployeeId.Value;

        if (string.IsNullOrWhiteSpace(dto.LeaveType) || !AllowedLeaveTypes.Contains(dto.LeaveType))
        {
            throw new ArgumentException("Invalid LeaveType. Allowed types are: Casual, Sick, Earned.");
        }

        if (string.IsNullOrWhiteSpace(dto.Reason))
        {
            throw new ArgumentException("Reason for leave is required.");
        }

        var start = dto.StartDate.Date;
        var end = dto.EndDate.Date;

        if (start > end)
        {
            throw new ArgumentException("Start date cannot be after end date.");
        }

        if (start < DateTime.UtcNow.Date)
        {
            throw new ArgumentException("Leave cannot be applied for past dates.");
        }

        var requestedDays = (end - start).Days + 1;
        if (requestedDays <= 0)
        {
            throw new ArgumentException("Invalid leave duration.");
        }

        // Check employee balance
        var balance = await _leaveRepository.GetLeaveBalanceAsync(empId)
            ?? throw new InvalidOperationException("Leave balance record not found for employee.");

        if (balance.RemainingLeaves < requestedDays)
        {
            throw new InvalidOperationException($"Insufficient leave balance. Requested: {requestedDays} days, Available: {balance.RemainingLeaves} days.");
        }

        // Check for overlapping leaves
        var hasOverlap = await _leaveRepository.HasOverlappingLeaveAsync(empId, start, end);
        if (hasOverlap)
        {
            throw new InvalidOperationException("You already have a pending or approved leave request overlapping these dates.");
        }

        var request = new LeaveRequest
        {
            EmployeeID = empId,
            LeaveType = dto.LeaveType.Trim(),
            StartDate = start,
            EndDate = end,
            Reason = dto.Reason.Trim(),
            Status = "Pending"
        };

        return await _leaveRepository.CreateLeaveRequestAsync(request);
    }

    public async Task<bool> ApproveLeaveAsync(int leaveId, string userRole, int? managerEmployeeId)
    {
        var request = await _leaveRepository.GetLeaveRequestEntityByIdAsync(leaveId)
            ?? throw new KeyNotFoundException("Leave request not found.");

        if (request.Status != "Pending")
        {
            throw new InvalidOperationException($"Cannot approve request with status '{request.Status}'.");
        }

        var employee = await _employeeRepository.GetEmployeeByIdAsync(request.EmployeeID)
            ?? throw new KeyNotFoundException("Employee associated with leave request not found.");

        // Verify manager authority: user must be Admin or the employee's direct reporting manager
        if (userRole != "Admin")
        {
            if (!managerEmployeeId.HasValue || employee.ManagerID != managerEmployeeId.Value)
            {
                throw new UnauthorizedAccessException("You can only approve leave requests for your direct reports.");
            }
        }

        var approverId = managerEmployeeId ?? employee.ManagerID ?? employee.EmployeeID;
        var requestedDays = (request.EndDate.Date - request.StartDate.Date).Days + 1;

        var balance = await _leaveRepository.GetLeaveBalanceAsync(request.EmployeeID)
            ?? throw new InvalidOperationException("Employee leave balance not found.");

        if (balance.RemainingLeaves < requestedDays)
        {
            throw new InvalidOperationException($"Cannot approve: employee only has {balance.RemainingLeaves} days remaining, but request requires {requestedDays} days.");
        }

        var success = await _leaveRepository.ApproveLeaveTransactionAsync(
            leaveId,
            request.EmployeeID,
            approverId,
            requestedDays
        );

        if (!success)
        {
            throw new InvalidOperationException("Failed to commit leave approval transaction. Please retry.");
        }

        return true;
    }

    public async Task<bool> RejectLeaveAsync(int leaveId, string userRole, int? managerEmployeeId)
    {
        var request = await _leaveRepository.GetLeaveRequestEntityByIdAsync(leaveId)
            ?? throw new KeyNotFoundException("Leave request not found.");

        if (request.Status != "Pending")
        {
            throw new InvalidOperationException($"Cannot reject request with status '{request.Status}'.");
        }

        var employee = await _employeeRepository.GetEmployeeByIdAsync(request.EmployeeID)
            ?? throw new KeyNotFoundException("Employee associated with leave request not found.");

        // Verify manager authority: Admin or direct manager
        if (userRole != "Admin")
        {
            if (!managerEmployeeId.HasValue || employee.ManagerID != managerEmployeeId.Value)
            {
                throw new UnauthorizedAccessException("You can only reject leave requests for your direct reports.");
            }
        }

        var rejecterId = managerEmployeeId ?? employee.ManagerID ?? employee.EmployeeID;
        return await _leaveRepository.RejectLeaveRequestAsync(leaveId, rejecterId);
    }
}
