using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using HrmsApi.Helpers;
using HrmsApi.Models;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace HrmsApi.Tests;

public class JwtHelperTests
{
    private readonly IConfiguration _config;

    public JwtHelperTests()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            {"Jwt:Key", "SuperSecretTestingKeyForJwtTokenGeneration2026!HRMS"},
            {"Jwt:Issuer", "HrmsApiTest"},
            {"Jwt:Audience", "HrmsClientTest"},
            {"Jwt:ExpiresInHours", "24"}
        };

        _config = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();
    }

    [Fact]
    public void GenerateToken_ShouldCreateValidJwtWithClaims()
    {
        // Arrange
        var helper = new JwtHelper(_config);
        var user = new User
        {
            UserID = 42,
            Name = "John Doe",
            Email = "john.doe@hrms.local",
            Role = "Employee"
        };
        int employeeId = 101;

        // Act
        var tokenString = helper.GenerateToken(user, employeeId);

        // Assert
        Assert.NotNull(tokenString);
        var handler = new JwtSecurityTokenHandler();
        var token = handler.ReadJwtToken(tokenString);

        Assert.Equal("HrmsApiTest", token.Issuer);
        Assert.Contains("HrmsClientTest", token.Audiences);

        var nameIdClaim = token.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        var nameClaim = token.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Name);
        var emailClaim = token.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email);
        var roleClaim = token.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role);
        var empIdClaim = token.Claims.FirstOrDefault(c => c.Type == "EmployeeID");

        Assert.NotNull(nameIdClaim);
        Assert.Equal("42", nameIdClaim.Value);

        Assert.NotNull(nameClaim);
        Assert.Equal("John Doe", nameClaim.Value);

        Assert.NotNull(emailClaim);
        Assert.Equal("john.doe@hrms.local", emailClaim.Value);

        Assert.NotNull(roleClaim);
        Assert.Equal("Employee", roleClaim.Value);

        Assert.NotNull(empIdClaim);
        Assert.Equal("101", empIdClaim.Value);
    }

    [Fact]
    public void GenerateToken_WithoutEmployeeId_ShouldOmitEmployeeIdClaim()
    {
        // Arrange
        var helper = new JwtHelper(_config);
        var user = new User
        {
            UserID = 1,
            Name = "Super Admin",
            Email = "admin@hrms.local",
            Role = "Admin"
        };

        // Act
        var tokenString = helper.GenerateToken(user, null);

        // Assert
        var handler = new JwtSecurityTokenHandler();
        var token = handler.ReadJwtToken(tokenString);
        var empIdClaim = token.Claims.FirstOrDefault(c => c.Type == "EmployeeID");

        Assert.Null(empIdClaim);
    }
}
