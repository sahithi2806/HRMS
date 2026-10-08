using Dapper;
using HrmsApi.Data;
using HrmsApi.DTOs;
using HrmsApi.Models;

namespace HrmsApi.Repositories;

public class EmployeeRepository : IEmployeeRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public EmployeeRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IEnumerable<EmployeeResponseDto>> GetAllEmployeesAsync(string? search = null, string? status = null, string? department = null)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = """
            SELECT 
                e.EmployeeID,
                e.UserID,
                u.Name,
                u.Email,
                u.Role,
                e.Department,
                e.Position,
                e.JoiningDate,
                e.Salary,
                e.Status,
                e.ManagerID,
                mU.Name AS ManagerName,
                lb.TotalLeaves,
                lb.UsedLeaves,
                lb.RemainingLeaves
            FROM Employees e
            INNER JOIN Users u ON e.UserID = u.UserID
            LEFT JOIN Employees mE ON e.ManagerID = mE.EmployeeID
            LEFT JOIN Users mU ON mE.UserID = mU.UserID
            LEFT JOIN LeaveBalance lb ON e.EmployeeID = lb.EmployeeID
            WHERE (@Status IS NULL OR e.Status = @Status)
              AND (@Department IS NULL OR e.Department = @Department)
              AND (@Search IS NULL OR (u.Name LIKE '%' + @Search + '%' OR u.Email LIKE '%' + @Search + '%' OR e.Position LIKE '%' + @Search + '%'))
            ORDER BY e.EmployeeID DESC
            """;

        return await connection.QueryAsync<EmployeeResponseDto>(sql, new { Search = search, Status = status, Department = department });
    }

    public async Task<IEnumerable<EmployeeResponseDto>> GetDirectReportsAsync(int managerEmployeeId)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT 
                e.EmployeeID,
                e.UserID,
                u.Name,
                u.Email,
                u.Role,
                e.Department,
                e.Position,
                e.JoiningDate,
                e.Salary,
                e.Status,
                e.ManagerID,
                mU.Name AS ManagerName,
                lb.TotalLeaves,
                lb.UsedLeaves,
                lb.RemainingLeaves
            FROM Employees e
            INNER JOIN Users u ON e.UserID = u.UserID
            LEFT JOIN Employees mE ON e.ManagerID = mE.EmployeeID
            LEFT JOIN Users mU ON mE.UserID = mU.UserID
            LEFT JOIN LeaveBalance lb ON e.EmployeeID = lb.EmployeeID
            WHERE e.ManagerID = @ManagerID
            ORDER BY u.Name ASC
            """;

        return await connection.QueryAsync<EmployeeResponseDto>(sql, new { ManagerID = managerEmployeeId });
    }

    public async Task<EmployeeResponseDto?> GetEmployeeByIdAsync(int employeeId)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT 
                e.EmployeeID,
                e.UserID,
                u.Name,
                u.Email,
                u.Role,
                e.Department,
                e.Position,
                e.JoiningDate,
                e.Salary,
                e.Status,
                e.ManagerID,
                mU.Name AS ManagerName,
                lb.TotalLeaves,
                lb.UsedLeaves,
                lb.RemainingLeaves
            FROM Employees e
            INNER JOIN Users u ON e.UserID = u.UserID
            LEFT JOIN Employees mE ON e.ManagerID = mE.EmployeeID
            LEFT JOIN Users mU ON mE.UserID = mU.UserID
            LEFT JOIN LeaveBalance lb ON e.EmployeeID = lb.EmployeeID
            WHERE e.EmployeeID = @EmployeeID
            """;

        return await connection.QueryFirstOrDefaultAsync<EmployeeResponseDto>(sql, new { EmployeeID = employeeId });
    }

    public async Task<EmployeeResponseDto?> GetEmployeeByUserIdAsync(int userId)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT 
                e.EmployeeID,
                e.UserID,
                u.Name,
                u.Email,
                u.Role,
                e.Department,
                e.Position,
                e.JoiningDate,
                e.Salary,
                e.Status,
                e.ManagerID,
                mU.Name AS ManagerName,
                lb.TotalLeaves,
                lb.UsedLeaves,
                lb.RemainingLeaves
            FROM Employees e
            INNER JOIN Users u ON e.UserID = u.UserID
            LEFT JOIN Employees mE ON e.ManagerID = mE.EmployeeID
            LEFT JOIN Users mU ON mE.UserID = mU.UserID
            LEFT JOIN LeaveBalance lb ON e.EmployeeID = lb.EmployeeID
            WHERE e.UserID = @UserID
            """;

        return await connection.QueryFirstOrDefaultAsync<EmployeeResponseDto>(sql, new { UserID = userId });
    }

    public async Task<EmployeeResponseDto> CreateEmployeeWithUserAndBalanceAsync(User user, Employee employee, int totalLeaves)
    {
        using var connection = _connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        try
        {
            // 1. Insert User
            const string insertUserSql = """
                INSERT INTO Users (Name, Email, PasswordHash, Role, CreatedAt)
                OUTPUT INSERTED.UserID
                VALUES (@Name, @Email, @PasswordHash, @Role, GETDATE());
                """;

            var userId = await connection.ExecuteScalarAsync<int>(insertUserSql, new
            {
                user.Name,
                user.Email,
                user.PasswordHash,
                user.Role
            }, transaction);

            employee.UserID = userId;

            // 2. Insert Employee
            const string insertEmployeeSql = """
                INSERT INTO Employees (UserID, Department, Position, JoiningDate, Salary, Status, ManagerID)
                OUTPUT INSERTED.EmployeeID
                VALUES (@UserID, @Department, @Position, @JoiningDate, @Salary, @Status, @ManagerID);
                """;

            var employeeId = await connection.ExecuteScalarAsync<int>(insertEmployeeSql, new
            {
                employee.UserID,
                employee.Department,
                employee.Position,
                employee.JoiningDate,
                employee.Salary,
                employee.Status,
                employee.ManagerID
            }, transaction);

            employee.EmployeeID = employeeId;

            // 3. Insert LeaveBalance
            const string insertBalanceSql = """
                INSERT INTO LeaveBalance (EmployeeID, TotalLeaves, UsedLeaves, RemainingLeaves)
                VALUES (@EmployeeID, @TotalLeaves, 0, @TotalLeaves);
                """;

            await connection.ExecuteAsync(insertBalanceSql, new
            {
                EmployeeID = employeeId,
                TotalLeaves = totalLeaves
            }, transaction);

            transaction.Commit();

            return (await GetEmployeeByIdAsync(employeeId))!;
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }

    public async Task<bool> UpdateEmployeeAsync(int employeeId, UpdateEmployeeDto dto)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            UPDATE Employees
            SET Department = @Department,
                Position = @Position,
                Salary = @Salary,
                ManagerID = @ManagerID
            WHERE EmployeeID = @EmployeeID;
            """;

        var affected = await connection.ExecuteAsync(sql, new
        {
            EmployeeID = employeeId,
            dto.Department,
            dto.Position,
            dto.Salary,
            dto.ManagerID
        });

        return affected > 0;
    }

    public async Task<bool> UpdateEmployeeStatusAsync(int employeeId, string status)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            UPDATE Employees
            SET Status = @Status
            WHERE EmployeeID = @EmployeeID;
            """;

        var affected = await connection.ExecuteAsync(sql, new
        {
            EmployeeID = employeeId,
            Status = status
        });

        return affected > 0;
    }

    public async Task<bool> IsEmailInUseAsync(string email, int? excludeUserId = null)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT COUNT(1)
            FROM Users
            WHERE Email = @Email AND (@ExcludeUserId IS NULL OR UserID != @ExcludeUserId);
            """;

        var count = await connection.ExecuteScalarAsync<int>(sql, new { Email = email, ExcludeUserId = excludeUserId });
        return count > 0;
    }

    public async Task<bool> ExistsAsync(int employeeId)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = "SELECT COUNT(1) FROM Employees WHERE EmployeeID = @EmployeeID;";
        var count = await connection.ExecuteScalarAsync<int>(sql, new { EmployeeID = employeeId });
        return count > 0;
    }
}
