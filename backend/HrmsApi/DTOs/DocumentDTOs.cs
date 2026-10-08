namespace HrmsApi.DTOs;

public class DocumentResponseDto
{
    public int DocumentID { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int UploadedBy { get; set; }
    public string UploaderName { get; set; } = string.Empty;
    public DateTime UploadedAt { get; set; }
    public bool IsActive { get; set; }
}

public class UpdateDocumentDto
{
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
}
