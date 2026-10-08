namespace HrmsApi.Models;

public class Document
{
    public int DocumentID { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public int UploadedBy { get; set; }
    public DateTime UploadedAt { get; set; }
    public bool IsActive { get; set; } = true;
}
