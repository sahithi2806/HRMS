using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Dapper;
using HrmsApi.Data;
using HrmsApi.DTOs;
using HrmsApi.Helpers;
using HrmsApi.Models;

namespace HrmsApi.Repositories;

public class AssetRepository : IAssetRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public AssetRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IEnumerable<AssetDto>> GetAllAsync(string? status = null, string? category = null)
    {
        using var connection = _connectionFactory.CreateConnection();
        var sql = """
            SELECT a.AssetID, a.AssetTag, a.Name, a.Category, a.SerialNumber, a.PurchaseDate, a.Status, a.CreatedAt,
                   aa.AssignmentID AS CurrentAssignmentID,
                   aa.EmployeeID AS AssignedToEmployeeID,
                   u.Name AS AssignedToEmployeeName,
                   e.Department AS AssignedToDepartment,
                   aa.AssignedAt
            FROM Assets a
            LEFT JOIN AssetAssignments aa ON a.AssetID = aa.AssetID AND aa.ReturnedAt IS NULL
            LEFT JOIN Employees e ON aa.EmployeeID = e.EmployeeID
            LEFT JOIN Users u ON e.UserID = u.UserID
            WHERE (@Status IS NULL OR a.Status = @Status)
              AND (@Category IS NULL OR a.Category = @Category)
            ORDER BY a.CreatedAt DESC;
            """;
        return await connection.QueryAsync<AssetDto>(sql, new { Status = status, Category = category });
    }

    public async Task<AssetDto?> GetByIdAsync(int assetId)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT a.AssetID, a.AssetTag, a.Name, a.Category, a.SerialNumber, a.PurchaseDate, a.Status, a.CreatedAt,
                   aa.AssignmentID AS CurrentAssignmentID,
                   aa.EmployeeID AS AssignedToEmployeeID,
                   u.Name AS AssignedToEmployeeName,
                   e.Department AS AssignedToDepartment,
                   aa.AssignedAt
            FROM Assets a
            LEFT JOIN AssetAssignments aa ON a.AssetID = aa.AssetID AND aa.ReturnedAt IS NULL
            LEFT JOIN Employees e ON aa.EmployeeID = e.EmployeeID
            LEFT JOIN Users u ON e.UserID = u.UserID
            WHERE a.AssetID = @AssetID;
            """;
        return await connection.QuerySingleOrDefaultAsync<AssetDto>(sql, new { AssetID = assetId });
    }

    public async Task<Asset?> GetEntityByIdAsync(int assetId)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT AssetID, AssetTag, Name, Category, SerialNumber, PurchaseDate, Status, CreatedAt
            FROM Assets
            WHERE AssetID = @AssetID;
            """;
        return await connection.QuerySingleOrDefaultAsync<Asset>(sql, new { AssetID = assetId });
    }

    public async Task<Asset?> GetByTagAsync(string assetTag)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT AssetID, AssetTag, Name, Category, SerialNumber, PurchaseDate, Status, CreatedAt
            FROM Assets
            WHERE AssetTag = @AssetTag;
            """;
        return await connection.QuerySingleOrDefaultAsync<Asset>(sql, new { AssetTag = assetTag });
    }

    public async Task<int> CreateAsync(Asset asset)
    {
        using var connection = _connectionFactory.CreateConnection();
        if (_connectionFactory.Provider == "Sqlite")
        {
            const string sql = """
                INSERT INTO Assets (AssetTag, Name, Category, SerialNumber, PurchaseDate, Status, CreatedAt)
                VALUES (@AssetTag, @Name, @Category, @SerialNumber, @PurchaseDate, 'Available', CURRENT_TIMESTAMP);
                SELECT last_insert_rowid();
                """;
            return await connection.ExecuteScalarAsync<int>(sql, asset);
        }
        else
        {
            const string sql = """
                INSERT INTO Assets (AssetTag, Name, Category, SerialNumber, PurchaseDate, Status, CreatedAt)
                VALUES (@AssetTag, @Name, @Category, @SerialNumber, @PurchaseDate, 'Available', GETUTCDATE());
                SELECT CAST(SCOPE_IDENTITY() AS INT);
                """;
            return await connection.ExecuteScalarAsync<int>(sql, asset);
        }
    }

    public async Task<bool> UpdateAsync(int assetId, UpdateAssetDto dto)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            UPDATE Assets
            SET Name = @Name,
                Category = @Category,
                SerialNumber = @SerialNumber,
                PurchaseDate = @PurchaseDate
            WHERE AssetID = @AssetID;
            """;
        var rows = await connection.ExecuteAsync(sql, new
        {
            AssetID = assetId,
            dto.Name,
            dto.Category,
            dto.SerialNumber,
            dto.PurchaseDate
        });
        return rows > 0;
    }

    public async Task<bool> UpdateStatusAsync(int assetId, string status)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            UPDATE Assets
            SET Status = @Status
            WHERE AssetID = @AssetID;
            """;
        var rows = await connection.ExecuteAsync(sql, new { AssetID = assetId, Status = status });
        return rows > 0;
    }

    public async Task<bool> AssignAssetAsync(int assetId, int employeeId, int assignedBy)
    {
        using var connection = _connectionFactory.CreateConnection();
        if (connection.State != ConnectionState.Open)
        {
            connection.Open();
        }

        using var tran = connection.BeginTransaction();
        try
        {
            // 1. Atomic conditional update to mark asset as Assigned ONLY IF it is currently Available
            const string updateAssetSql = """
                UPDATE Assets
                SET Status = 'Assigned'
                WHERE AssetID = @AssetID AND Status = 'Available';
                """;
            var updated = await connection.ExecuteAsync(updateAssetSql, new { AssetID = assetId }, tran);
            if (updated == 0)
            {
                tran.Rollback();
                return false;
            }

            // 2. Insert into AssetAssignments (Enforced by filtered UNIQUE index)
            string insertSql = _connectionFactory.Provider == "Sqlite"
                ? """
                    INSERT INTO AssetAssignments (AssetID, EmployeeID, AssignedBy, AssignedAt, ReturnedAt)
                    VALUES (@AssetID, @EmployeeID, @AssignedBy, CURRENT_TIMESTAMP, NULL);
                  """
                : """
                    INSERT INTO AssetAssignments (AssetID, EmployeeID, AssignedBy, AssignedAt, ReturnedAt)
                    VALUES (@AssetID, @EmployeeID, @AssignedBy, GETUTCDATE(), NULL);
                  """;

            await connection.ExecuteAsync(insertSql, new
            {
                AssetID = assetId,
                EmployeeID = employeeId,
                AssignedBy = assignedBy
            }, tran);

            tran.Commit();
            return true;
        }
        catch (Exception)
        {
            tran.Rollback();
            throw;
        }
    }

    public async Task<bool> UnassignAssetAsync(int assetId)
    {
        using var connection = _connectionFactory.CreateConnection();
        if (connection.State != ConnectionState.Open)
        {
            connection.Open();
        }

        using var tran = connection.BeginTransaction();
        try
        {
            string closeAssignmentSql = _connectionFactory.Provider == "Sqlite"
                ? """
                    UPDATE AssetAssignments
                    SET ReturnedAt = CURRENT_TIMESTAMP
                    WHERE AssetID = @AssetID AND ReturnedAt IS NULL;
                  """
                : """
                    UPDATE AssetAssignments
                    SET ReturnedAt = GETUTCDATE()
                    WHERE AssetID = @AssetID AND ReturnedAt IS NULL;
                  """;

            var rows = await connection.ExecuteAsync(closeAssignmentSql, new { AssetID = assetId }, tran);
            if (rows == 0)
            {
                tran.Rollback();
                return false;
            }

            const string updateAssetSql = """
                UPDATE Assets
                SET Status = 'Available'
                WHERE AssetID = @AssetID;
                """;
            await connection.ExecuteAsync(updateAssetSql, new { AssetID = assetId }, tran);

            tran.Commit();
            return true;
        }
        catch
        {
            tran.Rollback();
            throw;
        }
    }

    public async Task<IEnumerable<AssetDto>> GetMyAssetsAsync(int employeeId)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT a.AssetID, a.AssetTag, a.Name, a.Category, a.SerialNumber, a.PurchaseDate, a.Status, a.CreatedAt,
                   aa.AssignmentID AS CurrentAssignmentID,
                   aa.EmployeeID AS AssignedToEmployeeID,
                   u.Name AS AssignedToEmployeeName,
                   e.Department AS AssignedToDepartment,
                   aa.AssignedAt
            FROM Assets a
            INNER JOIN AssetAssignments aa ON a.AssetID = aa.AssetID AND aa.ReturnedAt IS NULL
            INNER JOIN Employees e ON aa.EmployeeID = e.EmployeeID
            INNER JOIN Users u ON e.UserID = u.UserID
            WHERE aa.EmployeeID = @EmployeeID
            ORDER BY aa.AssignedAt DESC;
            """;
        return await connection.QueryAsync<AssetDto>(sql, new { EmployeeID = employeeId });
    }

    public async Task<bool> IsAssetAssignedToEmployeeAsync(int assetId, int employeeId)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT COUNT(1)
            FROM AssetAssignments
            WHERE AssetID = @AssetID AND EmployeeID = @EmployeeID AND ReturnedAt IS NULL;
            """;
        var count = await connection.ExecuteScalarAsync<int>(sql, new { AssetID = assetId, EmployeeID = employeeId });
        return count > 0;
    }

    public async Task<int> CreateRequestAsync(AssetRequest request)
    {
        using var connection = _connectionFactory.CreateConnection();
        if (_connectionFactory.Provider == "Sqlite")
        {
            const string sql = """
                INSERT INTO AssetRequests (AssetID, EmployeeID, RequestType, Description, Status, CreatedAt)
                VALUES (@AssetID, @EmployeeID, @RequestType, @Description, 'Pending', CURRENT_TIMESTAMP);
                SELECT last_insert_rowid();
                """;
            return await connection.ExecuteScalarAsync<int>(sql, request);
        }
        else
        {
            const string sql = """
                INSERT INTO AssetRequests (AssetID, EmployeeID, RequestType, Description, Status, CreatedAt)
                VALUES (@AssetID, @EmployeeID, @RequestType, @Description, 'Pending', GETUTCDATE());
                SELECT CAST(SCOPE_IDENTITY() AS INT);
                """;
            return await connection.ExecuteScalarAsync<int>(sql, request);
        }
    }

    public async Task<IEnumerable<AssetRequestDto>> GetRequestsAsync(int? employeeId = null)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT ar.AssetRequestID, ar.AssetID, a.AssetTag, a.Name AS AssetName, a.Category AS AssetCategory,
                   ar.EmployeeID, u.Name AS EmployeeName, e.Department,
                   ar.RequestType, ar.Description, ar.Status,
                   ar.ReviewedBy, ru.Name AS ReviewerName, ar.ReviewedAt,
                   ar.AdminComment, ar.CreatedAt
            FROM AssetRequests ar
            INNER JOIN Assets a ON ar.AssetID = a.AssetID
            INNER JOIN Employees e ON ar.EmployeeID = e.EmployeeID
            INNER JOIN Users u ON e.UserID = u.UserID
            LEFT JOIN Employees re ON ar.ReviewedBy = re.EmployeeID
            LEFT JOIN Users ru ON re.UserID = ru.UserID
            WHERE (@EmployeeID IS NULL OR ar.EmployeeID = @EmployeeID)
            ORDER BY ar.CreatedAt DESC;
            """;
        return await connection.QueryAsync<AssetRequestDto>(sql, new { EmployeeID = employeeId });
    }

    public async Task<AssetRequest?> GetRequestByIdAsync(int requestId)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT AssetRequestID, AssetID, EmployeeID, RequestType, Description, Status,
                   ReviewedBy, ReviewedAt, AdminComment, CreatedAt
            FROM AssetRequests
            WHERE AssetRequestID = @AssetRequestID;
            """;
        return await connection.QuerySingleOrDefaultAsync<AssetRequest>(sql, new { AssetRequestID = requestId });
    }

    public async Task<bool> UpdateRequestStatusAsync(int requestId, string status, int reviewerId, string? comment)
    {
        using var connection = _connectionFactory.CreateConnection();
        string reviewedAt = _connectionFactory.Provider == "Sqlite" ? DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss") : DateTime.UtcNow.ToString("o");

        const string sql = """
            UPDATE AssetRequests
            SET Status = @Status,
                ReviewedBy = @ReviewedBy,
                ReviewedAt = @ReviewedAt,
                AdminComment = @AdminComment
            WHERE AssetRequestID = @AssetRequestID AND Status = 'Pending';
            """;
        var rows = await connection.ExecuteAsync(sql, new
        {
            AssetRequestID = requestId,
            Status = status,
            ReviewedBy = reviewerId,
            ReviewedAt = reviewedAt,
            AdminComment = comment
        });
        return rows > 0;
    }

    public async Task<bool> CancelRequestAsync(int requestId, int employeeId)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            UPDATE AssetRequests
            SET Status = 'Cancelled'
            WHERE AssetRequestID = @AssetRequestID AND EmployeeID = @EmployeeID AND Status = 'Pending';
            """;
        var rows = await connection.ExecuteAsync(sql, new { AssetRequestID = requestId, EmployeeID = employeeId });
        return rows > 0;
    }
}
