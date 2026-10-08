using HrmsApi.DTOs;
using HrmsApi.Helpers;
using HrmsApi.Repositories;

namespace HrmsApi.Services;

public class AuthService : IAuthService
{
    private readonly IAuthRepository _authRepository;
    private readonly JwtHelper _jwtHelper;

    public AuthService(IAuthRepository authRepository, JwtHelper jwtHelper)
    {
        _authRepository = authRepository;
        _jwtHelper = jwtHelper;
    }

    public async Task<LoginResponseDto> LoginAsync(LoginRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            throw new ArgumentException("Email and password are required.");
        }

        var user = await _authRepository.GetUserByEmailAsync(request.Email.Trim().ToLower());
        if (user == null)
        {
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        var passwordValid = PasswordHasher.VerifyPassword(request.Password, user.PasswordHash);
        if (!passwordValid)
        {
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        var employee = await _authRepository.GetEmployeeByUserIdAsync(user.UserID);

        if (employee != null && employee.Status == "Inactive")
        {
            throw new UnauthorizedAccessException("Your account has been deactivated. Please contact HR.");
        }

        var token = _jwtHelper.GenerateToken(user, employee?.EmployeeID);

        var profile = new UserProfileDto
        {
            UserID = user.UserID,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role,
            EmployeeID = employee?.EmployeeID,
            Department = employee?.Department,
            Position = employee?.Position
        };

        return new LoginResponseDto
        {
            Token = token,
            User = profile
        };
    }

    public async Task<UserProfileDto> GetCurrentUserProfileAsync(int userId)
    {
        var user = await _authRepository.GetUserByIdAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        var employee = await _authRepository.GetEmployeeByUserIdAsync(user.UserID);

        return new UserProfileDto
        {
            UserID = user.UserID,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role,
            EmployeeID = employee?.EmployeeID,
            Department = employee?.Department,
            Position = employee?.Position
        };
    }
}
