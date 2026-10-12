using Dapper;
using HrmsApi.Data;
using HrmsApi.DTOs;
using HrmsApi.Models;

namespace HrmsApi.Repositories;

public class DocumentRepository : IDocumentRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public DocumentRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IEnumerable<DocumentResponseDto>> GetActiveDocumentsAsync(string? category = null)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT 
                d.DocumentID,
                d.Title,
                d.Category,
                d.UploadedBy,
                u.Name AS UploaderName,
                d.UploadedAt,
                d.IsActive
            FROM Documents d
            INNER JOIN Users u ON d.UploadedBy = u.UserID
            WHERE d.IsActive = 1
              AND (@Category IS NULL OR d.Category = @Category)
            ORDER BY d.UploadedAt DESC
            """;

        return await connection.QueryAsync<DocumentResponseDto>(sql, new { Category = category });
    }

    public async Task<IEnumerable<DocumentResponseDto>> GetAllDocumentsAdminAsync(string? category = null)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT 
                d.DocumentID,
                d.Title,
                d.Category,
                d.UploadedBy,
                u.Name AS UploaderName,
                d.UploadedAt,
                d.IsActive
            FROM Documents d
            INNER JOIN Users u ON d.UploadedBy = u.UserID
            WHERE (@Category IS NULL OR d.Category = @Category)
            ORDER BY d.UploadedAt DESC
            """;

        return await connection.QueryAsync<DocumentResponseDto>(sql, new { Category = category });
    }

    public async Task<Document?> GetDocumentEntityByIdAsync(int documentId)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT DocumentID, Title, Category, FilePath, UploadedBy, UploadedAt, IsActive
            FROM Documents
            WHERE DocumentID = @DocumentID
            """;

        return await connection.QueryFirstOrDefaultAsync<Document>(sql, new { DocumentID = documentId });
    }

    public async Task<DocumentResponseDto?> GetDocumentByIdAsync(int documentId)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            SELECT 
                d.DocumentID,
                d.Title,
                d.Category,
                d.UploadedBy,
                u.Name AS UploaderName,
                d.UploadedAt,
                d.IsActive
            FROM Documents d
            INNER JOIN Users u ON d.UploadedBy = u.UserID
            WHERE d.DocumentID = @DocumentID
            """;

        return await connection.QueryFirstOrDefaultAsync<DocumentResponseDto>(sql, new { DocumentID = documentId });
    }

    public async Task<DocumentResponseDto> CreateDocumentAsync(Document document)
    {
        using var connection = _connectionFactory.CreateConnection();
        var isSqlite = _connectionFactory.Provider == "Sqlite";
        var sql = isSqlite
            ? """
              INSERT INTO Documents (Title, Category, FilePath, UploadedBy, UploadedAt, IsActive)
              VALUES (@Title, @Category, @FilePath, @UploadedBy, datetime('now'), @IsActive);
              SELECT last_insert_rowid();
              """
            : """
              INSERT INTO Documents (Title, Category, FilePath, UploadedBy, UploadedAt, IsActive)
              OUTPUT INSERTED.DocumentID
              VALUES (@Title, @Category, @FilePath, @UploadedBy, GETDATE(), @IsActive);
              """;

        var id = await connection.ExecuteScalarAsync<int>(sql, new
        {
            document.Title,
            document.Category,
            document.FilePath,
            document.UploadedBy,
            document.IsActive
        });

        document.DocumentID = id;
        return (await GetDocumentByIdAsync(id))!;
    }

    public async Task<bool> UpdateDocumentMetadataAsync(int documentId, UpdateDocumentDto dto)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            UPDATE Documents
            SET Title = @Title,
                Category = @Category
            WHERE DocumentID = @DocumentID;
            """;

        var affected = await connection.ExecuteAsync(sql, new
        {
            DocumentID = documentId,
            dto.Title,
            dto.Category
        });

        return affected > 0;
    }

    public async Task<bool> DeactivateDocumentAsync(int documentId)
    {
        using var connection = _connectionFactory.CreateConnection();
        const string sql = """
            UPDATE Documents
            SET IsActive = 0
            WHERE DocumentID = @DocumentID;
            """;

        var affected = await connection.ExecuteAsync(sql, new { DocumentID = documentId });
        return affected > 0;
    }
}
