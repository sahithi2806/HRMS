using HrmsApi.DTOs;
using HrmsApi.Helpers;
using HrmsApi.Repositories;
using HrmsApi.Services;
using Moq;
using Xunit;

namespace HrmsApi.Tests;

public class EmployeeServiceHardeningTests
{
    private readonly Mock<IEmployeeRepository> _mockRepo;
    private readonly EmployeeService _service;

    public EmployeeServiceHardeningTests()
    {
        _mockRepo = new Mock<IEmployeeRepository>();
        _service = new EmployeeService(_mockRepo.Object);
    }

    [Fact]
    public async Task UpdateEmployeeStatus_WhenEmployeeHasActiveDirectReports_ThrowsConflictException()
    {
        var empId = 2;
        var existing = new EmployeeResponseDto { EmployeeID = empId, Role = "Manager", Status = "Active" };

        _mockRepo.Setup(r => r.GetEmployeeByIdAsync(empId)).ReturnsAsync(existing);
        _mockRepo.Setup(r => r.HasActiveDirectReportsAsync(empId)).ReturnsAsync(true);

        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            _service.UpdateEmployeeStatusAsync(empId, "Inactive", "Resignation"));

        Assert.Contains("active direct reports", ex.Message);
    }

    [Fact]
    public async Task UpdateEmployeeStatus_WhenLastActiveAdmin_ThrowsConflictException()
    {
        var adminEmpId = 1;
        var existing = new EmployeeResponseDto { EmployeeID = adminEmpId, Role = "Admin", Status = "Active" };

        _mockRepo.Setup(r => r.GetEmployeeByIdAsync(adminEmpId)).ReturnsAsync(existing);
        _mockRepo.Setup(r => r.HasActiveDirectReportsAsync(adminEmpId)).ReturnsAsync(false);
        _mockRepo.Setup(r => r.CountActiveAdminsAsync()).ReturnsAsync(1); // Only 1 active admin!

        var ex = await Assert.ThrowsAsync<ConflictException>(() =>
            _service.UpdateEmployeeStatusAsync(adminEmpId, "Inactive", "Departed"));

        Assert.Contains("last active Admin", ex.Message);
    }

    [Fact]
    public async Task UpdateEmployee_WhenManagerWouldCreateCycle_ThrowsArgumentException()
    {
        var empId = 5;
        var newMgrId = 10;
        var existing = new EmployeeResponseDto { EmployeeID = empId, Status = "Active" };
        var newMgr = new EmployeeResponseDto { EmployeeID = newMgrId, Status = "Active", Role = "Manager" };

        _mockRepo.Setup(r => r.GetEmployeeByIdAsync(empId)).ReturnsAsync(existing);
        _mockRepo.Setup(r => r.GetEmployeeByIdAsync(newMgrId)).ReturnsAsync(newMgr);
        _mockRepo.Setup(r => r.WouldCreateManagerCycleAsync(empId, newMgrId)).ReturnsAsync(true);

        var dto = new UpdateEmployeeDto
        {
            Department = "Eng",
            Position = "Lead",
            Salary = 90000,
            ManagerID = newMgrId
        };

        var ex = await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.UpdateEmployeeAsync(empId, dto));

        Assert.Contains("reporting cycle", ex.Message);
    }

    [Fact]
    public async Task CreateEmployee_WithZeroSalary_ThrowsArgumentException()
    {
        var dto = new CreateEmployeeDto
        {
            Name = "John Zero",
            Email = "zero@hrms.local",
            Password = "Password123",
            Department = "Sales",
            Position = "Rep",
            Salary = 0 // Zero salary
        };

        var ex = await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.CreateEmployeeAsync(dto));

        Assert.Contains("Salary cannot be negative or zero", ex.Message);
    }

    [Fact]
    public async Task CreateEmployee_WhenManagerIsInactive_ThrowsArgumentException()
    {
        var dto = new CreateEmployeeDto
        {
            Name = "Jane Doe",
            Email = "jane.new@hrms.local",
            Password = "Password123",
            Department = "IT",
            Position = "Junior",
            Salary = 50000,
            ManagerID = 4
        };

        var inactiveMgr = new EmployeeResponseDto { EmployeeID = 4, Status = "Inactive", Role = "Manager" };
        _mockRepo.Setup(r => r.IsEmailInUseAsync(It.IsAny<string>(), It.IsAny<int?>())).ReturnsAsync(false);
        _mockRepo.Setup(r => r.GetEmployeeByIdAsync(4)).ReturnsAsync(inactiveMgr);

        var ex = await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.CreateEmployeeAsync(dto));

        Assert.Contains("must be active", ex.Message);
    }
}
