using HrmsApi.DTOs;
using HrmsApi.Models;

namespace HrmsApi.Repositories;

public interface IDocumentRepository
{
    Task<IEnumerable<DocumentResponseDto>> GetActiveDocumentsAsync(string? category = null);
    Task<IEnumerable<DocumentResponseDto>> GetAllDocumentsAdminAsync(string? category = null);
    Task<Document?> GetDocumentEntityByIdAsync(int documentId);
    Task<DocumentResponseDto?> GetDocumentByIdAsync(int documentId);
    Task<DocumentResponseDto> CreateDocumentAsync(Document document);
    Task<bool> UpdateDocumentMetadataAsync(int documentId, UpdateDocumentDto dto);
    Task<bool> DeactivateDocumentAsync(int documentId);
}
