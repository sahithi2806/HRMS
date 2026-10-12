using System.Data;
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
        var searchPattern = !string.IsNullOrWhiteSpace(search) ? $"%{search}%" : null;
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
              AND (@SearchPattern IS NULL OR (u.Name LIKE @SearchPattern OR u.Email LIKE @SearchPattern OR e.Position LIKE @SearchPattern))
            ORDER BY e.EmployeeID DESC
            """;

        return await connection.QueryAsync<EmployeeResponseDto>(sql, new { SearchPattern = searchPattern, Status = status, Department = department });
    }

    public async Task<IEnumerable<EmployeeResponseDto>> GetDirectReportsAsync(int managerEmployeeId, string? search = null, string? status = null, string? department = null)
    {
        using var connection = _connectionFactory.CreateConnection();
        var searchPattern = !string.IsNullOrWhiteSpace(search) ? $"%{search}%" : null;
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
            WHERE (e.ManagerID = @ManagerID OR e.EmployeeID = @ManagerID)
              AND (@Status IS NULL OR e.Status = @Status)
              AND (@Department IS NULL OR e.Department = @Department)
              AND (@SearchPattern IS NULL OR (u.Name LIKE @SearchPattern OR u.Email LIKE @SearchPattern OR e.Position LIKE @SearchPattern))
            ORDER BY u.Name ASC
            """;

        return await connection.QueryAsync<EmployeeResponseDto>(sql, new { ManagerID = managerEmployeeId, SearchPattern = searchPattern, Status = status, Department = department });
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
        if (connection.State != ConnectionState.Open)
        {
            connection.Open();
        }
        using var transaction = connection.BeginTransaction();

        try
        {
            var isSqlite = _connectionFactory.Provider == "Sqlite";

            // 1. Insert User
            var insertUserSql = isSqlite
                ? """
                  INSERT INTO Users (Name, Email, PasswordHash, Role, CreatedAt)
                  VALUES (@Name, @Email, @PasswordHash, @Role, datetime('now'));
                  SELECT last_insert_rowid();
                  """
                : """
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
            var insertEmployeeSql = isSqlite
                ? """
                  INSERT INTO Employees (UserID, Department, Position, JoiningDate, Salary, Status, ManagerID)
                  VALUES (@UserID, @Department, @Position, @JoiningDate, @Salary, @Status, @ManagerID);
                  SELECT last_insert_rowid();
                  """
                : """
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

            // 3. Insert LeaveBalance (RemainingLeaves is a persisted computed column TotalLeaves - UsedLeaves)
            const string insertBalanceSql = """
                INSERT INTO LeaveBalance (EmployeeID, TotalLeaves, UsedLeaves)
                VALUES (@EmployeeID, @TotalLeaves, 0);
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

    public async Task<bool> UpdateEmployeeStatusAsync(int employeeId, string status, string? exitReason = null)
    {
        using var connection = _connectionFactory.CreateConnection();
        var currentTimestamp = _connectionFactory.Provider == "Sqlite" ? "datetime('now')" : "GETUTCDATE()";
        var sql = $"""
            UPDATE Employees
            SET Status = @Status,
                ExitReason = CASE WHEN @Status = 'Inactive' THEN @ExitReason ELSE NULL END,
                DeactivatedAt = CASE WHEN @Status = 'Inactive' THEN {currentTimestamp} ELSE NULL END
            WHERE EmployeeID = @EmployeeID;
            """;

        var affected = await connection.ExecuteAsync(sql, new
        {
            EmployeeID = employeeId,
            Status = status,
            ExitReason = exitReason
        });

        return affected > 0;
    }

    public async Task<bool> HasActiveDirectReportsAsync(int employeeId)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT COUNT(1)
            FROM Employees
            WHERE ManagerID = @EmployeeID AND Status = 'Active';
            """;

        var count = await connection.ExecuteScalarAsync<int>(sql, new { EmployeeID = employeeId });
        return count > 0;
    }

    public async Task<int> CountActiveAdminsAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT COUNT(1)
            FROM Employees e
            INNER JOIN Users u ON e.UserID = u.UserID
            WHERE u.Role = 'Admin' AND e.Status = 'Active';
            """;

        return await connection.ExecuteScalarAsync<int>(sql);
    }

    public async Task<int?> GetManagerIdAsync(int employeeId)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = "SELECT ManagerID FROM Employees WHERE EmployeeID = @EmployeeID;";
        return await connection.QueryFirstOrDefaultAsync<int?>(sql, new { EmployeeID = employeeId });
    }

    public async Task<bool> WouldCreateManagerCycleAsync(int employeeId, int newManagerId)
    {
        // Follow manager chain up from newManagerId: if we ever reach employeeId, it's a cycle!
        int currentId = newManagerId;
        var visited = new HashSet<int>();

        while (currentId > 0 && visited.Add(currentId))
        {
            if (currentId == employeeId)
            {
                return true;
            }

            var nextManagerId = await GetManagerIdAsync(currentId);
            if (!nextManagerId.HasValue || nextManagerId.Value == 0)
            {
                break;
            }

            currentId = nextManagerId.Value;
        }

        return false;
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
