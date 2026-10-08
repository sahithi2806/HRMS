using HrmsApi.DTOs;
using HrmsApi.Models;
using HrmsApi.Repositories;
using HrmsApi.Services;
using Moq;
using Xunit;

namespace HrmsApi.Tests;

public class EmployeeServiceTests
{
    private readonly Mock<IEmployeeRepository> _mockEmpRepo;
    private readonly EmployeeService _empService;

    public EmployeeServiceTests()
    {
        _mockEmpRepo = new Mock<IEmployeeRepository>();
        _empService = new EmployeeService(_mockEmpRepo.Object);
    }

    [Fact]
    public async Task CreateEmployee_WithShortPassword_ThrowsArgumentException()
    {
        var dto = new CreateEmployeeDto
        {
            Name = "John Doe",
            Email = "john@hrms.local",
            Password = "123",
            Department = "IT",
            Position = "Developer",
            Salary = 60000
        };

        var ex = await Assert.ThrowsAsync<ArgumentException>(() =>
            _empService.CreateEmployeeAsync(dto));

        Assert.Contains("Password must be at least 6 characters", ex.Message);
    }

    [Fact]
    public async Task CreateEmployee_WithNegativeSalary_ThrowsArgumentException()
    {
        var dto = new CreateEmployeeDto
        {
            Name = "John Doe",
            Email = "john@hrms.local",
            Password = "SecurePassword123",
            Department = "IT",
            Position = "Developer",
            Salary = -5000
        };

        var ex = await Assert.ThrowsAsync<ArgumentException>(() =>
            _empService.CreateEmployeeAsync(dto));

        Assert.Contains("Salary cannot be negative", ex.Message);
    }

    [Fact]
    public async Task CreateEmployee_WhenEmailAlreadyInUse_ThrowsInvalidOperationException()
    {
        var dto = new CreateEmployeeDto
        {
            Name = "John Doe",
            Email = "john@hrms.local",
            Password = "SecurePassword123",
            Department = "IT",
            Position = "Developer",
            Salary = 65000
        };

        _mockEmpRepo.Setup(r => r.IsEmailInUseAsync("john@hrms.local"))
            .ReturnsAsync(true);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _empService.CreateEmployeeAsync(dto));

        Assert.Contains("already in use", ex.Message);
    }

    [Fact]
    public async Task CreateEmployee_WhenManagerDoesNotExist_ThrowsArgumentException()
    {
        var dto = new CreateEmployeeDto
        {
            Name = "John Doe",
            Email = "john@hrms.local",
            Password = "SecurePassword123",
            Department = "IT",
            Position = "Developer",
            Salary = 65000,
            ManagerID = 999
        };

        _mockEmpRepo.Setup(r => r.IsEmailInUseAsync("john@hrms.local"))
            .ReturnsAsync(false);
        _mockEmpRepo.Setup(r => r.ExistsAsync(999))
            .ReturnsAsync(false);

        var ex = await Assert.ThrowsAsync<ArgumentException>(() =>
            _empService.CreateEmployeeAsync(dto));

        Assert.Contains("manager does not exist", ex.Message);
    }

    [Fact]
    public async Task CreateEmployee_WithValidData_CreatesSuccessfully()
    {
        var dto = new CreateEmployeeDto
        {
            Name = "Jane Smith",
            Email = "jane@hrms.local",
            Password = "SecurePassword123",
            Department = "HR",
            Position = "Specialist",
            Salary = 70000,
            TotalLeaves = 22
        };

        _mockEmpRepo.Setup(r => r.IsEmailInUseAsync("jane@hrms.local"))
            .ReturnsAsync(false);

        var expectedResponse = new EmployeeResponseDto
        {
            EmployeeID = 10,
            UserID = 15,
            Name = "Jane Smith",
            Email = "jane@hrms.local",
            Department = "HR",
            Position = "Specialist",
            Salary = 70000,
            Status = "Active"
        };

        _mockEmpRepo.Setup(r => r.CreateEmployeeWithUserAndBalanceAsync(
            It.Is<User>(u => u.Email == "jane@hrms.local" && u.Name == "Jane Smith"),
            It.Is<Employee>(e => e.Department == "HR" && e.Salary == 70000),
            22))
            .ReturnsAsync(expectedResponse);

        var result = await _empService.CreateEmployeeAsync(dto);

        Assert.NotNull(result);
        Assert.Equal("Jane Smith", result.Name);
        Assert.Equal("jane@hrms.local", result.Email);
    }

    [Fact]
    public async Task UpdateEmployee_WhenAssigningSelfAsManager_ThrowsArgumentException()
    {
        var empId = 5;
        var existing = new EmployeeResponseDto { EmployeeID = empId, Name = "Alice" };

        _mockEmpRepo.Setup(r => r.GetEmployeeByIdAsync(empId))
            .ReturnsAsync(existing);

        var dto = new UpdateEmployeeDto
        {
            Department = "Engineering",
            Position = "Lead",
            Salary = 80000,
            ManagerID = empId // Self-referential
        };

        var ex = await Assert.ThrowsAsync<ArgumentException>(() =>
            _empService.UpdateEmployeeAsync(empId, dto));

        Assert.Contains("cannot be their own manager", ex.Message);
    }

    [Theory]
    [InlineData("Suspended")]
    [InlineData("Pending")]
    [InlineData("Unknown")]
    public async Task UpdateEmployeeStatus_WithInvalidStatus_ThrowsArgumentException(string invalidStatus)
    {
        var ex = await Assert.ThrowsAsync<ArgumentException>(() =>
            _empService.UpdateEmployeeStatusAsync(1, invalidStatus));

        Assert.Contains("Status must be either 'Active' or 'Inactive'", ex.Message);
    }
}
