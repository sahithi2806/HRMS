using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using HrmsApi.Models;
using Microsoft.IdentityModel.Tokens;

namespace HrmsApi.Helpers;

public class JwtHelper
{
    private readonly IConfiguration _config;

    public JwtHelper(IConfiguration config)
    {
        _config = config;
    }

    public string GenerateToken(User user, int? employeeId = null)
    {
        var jwtSettings = _config.GetSection("Jwt");
        var secretKey = jwtSettings["Key"];
        if (string.IsNullOrWhiteSpace(secretKey) || secretKey.Contains("PLACEHOLDER") || secretKey.Length < 32)
        {
            throw new InvalidOperationException("JWT Key not configured, left as placeholder, or insecure (must be at least 32 characters).");
        }
        var issuer = jwtSettings["Issuer"] ?? "HrmsApi";
        var audience = jwtSettings["Audience"] ?? "HrmsClient";
        var expiryHours = int.TryParse(jwtSettings["ExpiresInHours"], out var hours) ? hours : 24;

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.UserID.ToString()),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("Role", user.Role)
        };

        if (employeeId.HasValue)
        {
            claims.Add(new Claim("EmployeeID", employeeId.Value.ToString()));
        }

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(expiryHours),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
