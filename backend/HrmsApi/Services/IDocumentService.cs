using HrmsApi.DTOs;

namespace HrmsApi.Services;

public interface IDocumentService
{
    Task<IEnumerable<DocumentResponseDto>> GetDocumentsAsync(string userRole, string? category = null);
    Task<DocumentResponseDto?> GetDocumentMetadataAsync(int documentId);
    Task<(Stream FileStream, string ContentType, string FileName)> DownloadDocumentAsync(int documentId);
    Task<DocumentResponseDto> UploadDocumentAsync(IFormFile file, string title, string category, int uploadedByUserId);
    Task<bool> UpdateDocumentMetadataAsync(int documentId, UpdateDocumentDto dto);
    Task<bool> DeactivateDocumentAsync(int documentId);
}
