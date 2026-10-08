using HrmsApi.DTOs;

namespace HrmsApi.Services;

public interface IAuthService
{
    Task<LoginResponseDto> LoginAsync(LoginRequestDto request);
    Task<UserProfileDto> GetCurrentUserProfileAsync(int userId);
}
