using HrmsApi.Models;

namespace HrmsApi.Repositories;

public interface IAuthRepository
{
    Task<User?> GetUserByEmailAsync(string email);
    Task<User?> GetUserByIdAsync(int userId);
    Task<Employee?> GetEmployeeByUserIdAsync(int userId);
}
