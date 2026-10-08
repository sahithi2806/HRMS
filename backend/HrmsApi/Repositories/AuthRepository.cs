using Dapper;
using HrmsApi.Data;
using HrmsApi.Models;

namespace HrmsApi.Repositories;

public class AuthRepository : IAuthRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public AuthRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<User?> GetUserByEmailAsync(string email)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT UserID, Name, Email, PasswordHash, Role, CreatedAt
            FROM Users
            WHERE Email = @Email
            """;
        return await connection.QueryFirstOrDefaultAsync<User>(sql, new { Email = email });
    }

    public async Task<User?> GetUserByIdAsync(int userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT UserID, Name, Email, PasswordHash, Role, CreatedAt
            FROM Users
            WHERE UserID = @UserID
            """;
        return await connection.QueryFirstOrDefaultAsync<User>(sql, new { UserID = userId });
    }

    public async Task<Employee?> GetEmployeeByUserIdAsync(int userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT EmployeeID, UserID, Department, Position, JoiningDate, Salary, Status, ManagerID
            FROM Employees
            WHERE UserID = @UserID
            """;
        return await connection.QueryFirstOrDefaultAsync<Employee>(sql, new { UserID = userId });
    }
}
