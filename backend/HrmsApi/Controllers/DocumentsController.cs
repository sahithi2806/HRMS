using System.Security.Claims;
using HrmsApi.DTOs;
using HrmsApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HrmsApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DocumentsController : ControllerBase
{
    private readonly IDocumentService _documentService;

    public DocumentsController(IDocumentService documentService)
    {
        _documentService = documentService;
    }

    private (int UserId, string Role) GetUserContext()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("Role")?.Value ?? "Employee";
        int.TryParse(userIdStr, out var userId);
        return (userId, role);
    }

    [HttpGet]
    public async Task<IActionResult> GetDocuments([FromQuery] string? category = null)
    {
        var ctx = GetUserContext();
        var documents = await _documentService.GetDocumentsAsync(ctx.Role, category);
        return Ok(documents);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetDocumentById(int id)
    {
        var doc = await _documentService.GetDocumentMetadataAsync(id);
        if (doc == null)
        {
            return NotFound(new { message = $"Document with ID {id} not found." });
        }
        return Ok(doc);
    }

    [HttpGet("{id:int}/download")]
    public async Task<IActionResult> DownloadDocument(int id)
    {
        var (fileStream, contentType, fileName) = await _documentService.DownloadDocumentAsync(id);
        return File(fileStream, contentType, fileName);
    }

    [HttpPost("upload")]
    [HttpPost]
    [Authorize(Roles = "Admin")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadDocument(
        [FromForm] IFormFile file,
        [FromForm] string title,
        [FromForm] string category)
    {
        var ctx = GetUserContext();
        var created = await _documentService.UploadDocumentAsync(file, title, category, ctx.UserId);
        return CreatedAtAction(nameof(GetDocumentById), new { id = created.DocumentID }, created);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateDocument(int id, [FromBody] UpdateDocumentDto dto)
    {
        var success = await _documentService.UpdateDocumentMetadataAsync(id, dto);
        if (!success)
        {
            return NotFound(new { message = $"Document with ID {id} not found." });
        }
        return Ok(new { message = "Document updated successfully." });
    }

    [HttpPatch("{id:int}/deactivate")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeactivateDocument(int id)
    {
        var success = await _documentService.DeactivateDocumentAsync(id);
        if (!success)
        {
            return NotFound(new { message = $"Document with ID {id} not found." });
        }
        return Ok(new { message = "Document deactivated successfully." });
    }
}
