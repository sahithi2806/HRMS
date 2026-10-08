using HrmsApi.DTOs;
using HrmsApi.Models;
using HrmsApi.Repositories;

namespace HrmsApi.Services;

public class DocumentService : IDocumentService
{
    private readonly IDocumentRepository _documentRepository;
    private readonly string _storageDirectory;
    private const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10 MB

    private static readonly Dictionary<string, string> AllowedMimeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        { ".pdf", "application/pdf" },
        { ".jpg", "image/jpeg" },
        { ".jpeg", "image/jpeg" },
        { ".png", "image/png" }
    };

    public DocumentService(IDocumentRepository documentRepository, IConfiguration configuration, IWebHostEnvironment environment)
    {
        _documentRepository = documentRepository;
        var relativePath = configuration["Storage:DocumentsPath"] ?? "Storage/Documents";
        _storageDirectory = Path.Combine(environment.ContentRootPath, relativePath);

        if (!Directory.Exists(_storageDirectory))
        {
            Directory.CreateDirectory(_storageDirectory);
        }
    }

    public async Task<IEnumerable<DocumentResponseDto>> GetDocumentsAsync(string userRole, string? category = null)
    {
        if (userRole == "Admin")
        {
            return await _documentRepository.GetAllDocumentsAdminAsync(category);
        }

        return await _documentRepository.GetActiveDocumentsAsync(category);
    }

    public async Task<DocumentResponseDto?> GetDocumentMetadataAsync(int documentId)
    {
        return await _documentRepository.GetDocumentByIdAsync(documentId);
    }

    public async Task<(Stream FileStream, string ContentType, string FileName)> DownloadDocumentAsync(int documentId)
    {
        var document = await _documentRepository.GetDocumentEntityByIdAsync(documentId)
            ?? throw new KeyNotFoundException("Document not found.");

        if (!document.IsActive)
        {
            throw new InvalidOperationException("This document has been deactivated.");
        }

        if (!File.Exists(document.FilePath))
        {
            throw new FileNotFoundException("Physical file not found on server.");
        }

        var ext = Path.GetExtension(document.FilePath).ToLowerInvariant();
        var contentType = AllowedMimeTypes.TryGetValue(ext, out var mime) ? mime : "application/octet-stream";
        var downloadName = $"{document.Title.Replace(" ", "_")}{ext}";

        var stream = new FileStream(document.FilePath, FileMode.Open, FileAccess.Read, FileShare.Read);
        return (stream, contentType, downloadName);
    }

    public async Task<DocumentResponseDto> UploadDocumentAsync(IFormFile file, string title, string category, int uploadedByUserId)
    {
        if (file == null || file.Length == 0)
        {
            throw new ArgumentException("A valid non-empty file must be provided.");
        }

        if (string.IsNullOrWhiteSpace(title))
        {
            throw new ArgumentException("Document title is required.");
        }

        if (string.IsNullOrWhiteSpace(category))
        {
            throw new ArgumentException("Document category is required.");
        }

        if (file.Length > MaxFileSizeBytes)
        {
            throw new ArgumentException("File size exceeds maximum permitted limit of 10 MB.");
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedMimeTypes.ContainsKey(extension))
        {
            throw new ArgumentException($"Unsupported file format. Only PDF, JPEG, and PNG are allowed.");
        }

        // Validate MIME type against allowed extensions
        var expectedMime = AllowedMimeTypes[extension];
        if (!string.Equals(file.ContentType, expectedMime, StringComparison.OrdinalIgnoreCase) && 
            !(extension is ".jpg" or ".jpeg" && file.ContentType.StartsWith("image/jpeg", StringComparison.OrdinalIgnoreCase)))
        {
            throw new ArgumentException("File Content-Type does not match its file extension.");
        }

        // Generate safe unique filename
        var safeFileName = $"{Guid.NewGuid():N}{extension}";
        var fullPath = Path.Combine(_storageDirectory, safeFileName);

        await using (var targetStream = new FileStream(fullPath, FileMode.Create, FileAccess.Write))
        {
            await file.CopyToAsync(targetStream);
        }

        var document = new Document
        {
            Title = title.Trim(),
            Category = category.Trim(),
            FilePath = fullPath,
            UploadedBy = uploadedByUserId,
            IsActive = true
        };

        return await _documentRepository.CreateDocumentAsync(document);
    }

    public async Task<bool> UpdateDocumentMetadataAsync(int documentId, UpdateDocumentDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Category))
        {
            throw new ArgumentException("Title and Category are required.");
        }

        var exists = await _documentRepository.GetDocumentByIdAsync(documentId);
        if (exists == null) throw new KeyNotFoundException("Document not found.");

        return await _documentRepository.UpdateDocumentMetadataAsync(documentId, dto);
    }

    public async Task<bool> DeactivateDocumentAsync(int documentId)
    {
        var exists = await _documentRepository.GetDocumentByIdAsync(documentId);
        if (exists == null) throw new KeyNotFoundException("Document not found.");

        return await _documentRepository.DeactivateDocumentAsync(documentId);
    }
}
