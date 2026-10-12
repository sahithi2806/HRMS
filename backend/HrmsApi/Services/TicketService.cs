using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HrmsApi.DTOs;
using HrmsApi.Helpers;
using HrmsApi.Models;
using HrmsApi.Repositories;
using Microsoft.Extensions.Configuration;

namespace HrmsApi.Services;

public class TicketService : ITicketService
{
    private readonly ITicketRepository _ticketRepository;
    private readonly int _reopenWindowDays;

    private static readonly HashSet<string> ValidCategories = new(StringComparer.OrdinalIgnoreCase)
    {
        "IT", "HR", "Payroll", "Facilities", "Admin", "Other"
    };

    private static readonly HashSet<string> ValidPriorities = new(StringComparer.OrdinalIgnoreCase)
    {
        "Low", "Medium", "High"
    };

    private static readonly HashSet<string> ValidStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "Open", "InProgress", "Resolved", "Closed"
    };

    public TicketService(ITicketRepository ticketRepository, IConfiguration configuration)
    {
        _ticketRepository = ticketRepository;
        var reopenConfig = configuration["Helpdesk:ReopenWindowDays"];
        _reopenWindowDays = int.TryParse(reopenConfig, out var days) ? days : 7;
    }

    public async Task<IEnumerable<TicketDto>> GetTicketsAsync(string role, int employeeId, string? status = null, string? priority = null, string? category = null)
    {
        int? filterEmpId = role == "Admin" ? null : employeeId;
        return await _ticketRepository.GetTicketsAsync(filterEmpId, status, priority, category);
    }

    public async Task<TicketDto> GetTicketByIdAsync(int ticketId, string role, int employeeId)
    {
        var ticket = await _ticketRepository.GetTicketByIdAsync(ticketId)
            ?? throw new KeyNotFoundException($"Ticket #{ticketId} not found.");

        if (role != "Admin" && ticket.EmployeeID != employeeId)
        {
            throw new UnauthorizedAccessException("You are not authorized to view this ticket.");
        }

        bool includeInternal = (role == "Admin");
        var comments = await _ticketRepository.GetCommentsByTicketIdAsync(ticketId, includeInternal);
        ticket.Comments = comments.ToList();

        return ticket;
    }

    public async Task<TicketDto> CreateTicketAsync(int employeeId, CreateTicketDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Subject))
            throw new ArgumentException("Subject is required.");
        if (string.IsNullOrWhiteSpace(dto.Description))
            throw new ArgumentException("Description is required.");
        if (!ValidCategories.Contains(dto.Category))
            throw new ArgumentException($"Invalid category '{dto.Category}'. Allowed: IT, HR, Payroll, Facilities, Admin, Other.");
        if (!ValidPriorities.Contains(dto.Priority))
            throw new ArgumentException($"Invalid priority '{dto.Priority}'. Allowed: Low, Medium, High.");

        var ticket = new Ticket
        {
            EmployeeID = employeeId,
            Category = dto.Category,
            Subject = dto.Subject.Trim(),
            Description = dto.Description.Trim(),
            Priority = dto.Priority,
            Status = "Open",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var created = await _ticketRepository.CreateTicketAsync(ticket);
        return (await _ticketRepository.GetTicketByIdAsync(created.TicketID))!;
    }

    public async Task<TicketCommentDto> AddCommentAsync(int ticketId, int authorEmployeeId, string role, CreateCommentDto dto)
    {
        var ticket = await _ticketRepository.GetTicketByIdAsync(ticketId)
            ?? throw new KeyNotFoundException($"Ticket #{ticketId} not found.");

        if (role != "Admin" && ticket.EmployeeID != authorEmployeeId)
        {
            throw new UnauthorizedAccessException("You are not authorized to comment on this ticket.");
        }

        if (string.IsNullOrWhiteSpace(dto.Body))
            throw new ArgumentException("Comment body is required.");

        if (dto.IsInternal && role != "Admin")
        {
            throw new UnauthorizedAccessException("Only administrators can post internal notes.");
        }

        var comment = new TicketComment
        {
            TicketID = ticketId,
            AuthorEmployeeID = authorEmployeeId,
            Body = dto.Body.Trim(),
            IsInternal = dto.IsInternal && role == "Admin",
            CreatedAt = DateTime.UtcNow
        };

        var created = await _ticketRepository.AddCommentAsync(comment);
        var comments = await _ticketRepository.GetCommentsByTicketIdAsync(ticketId, true);
        return comments.First(c => c.CommentID == created.CommentID);
    }

    public async Task UpdateTicketAsync(int ticketId, string role, UpdateTicketDto dto)
    {
        if (role != "Admin")
            throw new UnauthorizedAccessException("Only administrators can update ticket status, priority, or assignment.");

        var ticket = await _ticketRepository.GetTicketByIdAsync(ticketId)
            ?? throw new KeyNotFoundException($"Ticket #{ticketId} not found.");

        DateTime? resolvedAt = null;

        if (!string.IsNullOrWhiteSpace(dto.Status))
        {
            if (!ValidStatuses.Contains(dto.Status))
                throw new ArgumentException($"Invalid status '{dto.Status}'.");

            if (!string.Equals(ticket.Status, dto.Status, StringComparison.OrdinalIgnoreCase))
            {
                ValidateStatusTransition(ticket.Status, dto.Status, ticket.ResolvedAt ?? ticket.UpdatedAt);
                if (string.Equals(dto.Status, "Resolved", StringComparison.OrdinalIgnoreCase))
                {
                    resolvedAt = DateTime.UtcNow;
                }
            }
        }

        if (!string.IsNullOrWhiteSpace(dto.Priority) && !ValidPriorities.Contains(dto.Priority))
        {
            throw new ArgumentException($"Invalid priority '{dto.Priority}'.");
        }

        await _ticketRepository.UpdateTicketAsync(ticketId, dto.Status, dto.AssignedTo, dto.Priority, resolvedAt);
    }

    public async Task CloseTicketAsync(int ticketId, string role, int employeeId)
    {
        var ticket = await _ticketRepository.GetTicketByIdAsync(ticketId)
            ?? throw new KeyNotFoundException($"Ticket #{ticketId} not found.");

        if (role != "Admin" && ticket.EmployeeID != employeeId)
            throw new UnauthorizedAccessException("You are not authorized to close this ticket.");

        if (role != "Admin" && !string.Equals(ticket.Status, "Resolved", StringComparison.OrdinalIgnoreCase))
        {
            throw new ConflictException("Employees can only close tickets that are marked as Resolved.");
        }

        if (string.Equals(ticket.Status, "Closed", StringComparison.OrdinalIgnoreCase))
        {
            return; // Already closed
        }

        await _ticketRepository.UpdateTicketAsync(ticketId, "Closed", null, null, null);
    }

    public async Task ReopenTicketAsync(int ticketId, string role, int employeeId)
    {
        var ticket = await _ticketRepository.GetTicketByIdAsync(ticketId)
            ?? throw new KeyNotFoundException($"Ticket #{ticketId} not found.");

        if (role != "Admin" && ticket.EmployeeID != employeeId)
            throw new UnauthorizedAccessException("You are not authorized to reopen this ticket.");

        if (!string.Equals(ticket.Status, "Resolved", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(ticket.Status, "Closed", StringComparison.OrdinalIgnoreCase))
        {
            throw new ConflictException("Only resolved or closed tickets can be reopened.");
        }

        var referenceDate = ticket.ResolvedAt ?? ticket.UpdatedAt;
        if ((DateTime.UtcNow - referenceDate).TotalDays > _reopenWindowDays)
        {
            throw new ConflictException($"Cannot reopen ticket after the {_reopenWindowDays}-day window has expired.");
        }

        await _ticketRepository.UpdateTicketAsync(ticketId, "Open", null, null, null);
    }

    public async Task SubmitFeedbackAsync(int ticketId, int employeeId, TicketFeedbackDto dto)
    {
        var ticket = await _ticketRepository.GetTicketByIdAsync(ticketId)
            ?? throw new KeyNotFoundException($"Ticket #{ticketId} not found.");

        if (ticket.EmployeeID != employeeId)
            throw new UnauthorizedAccessException("Only the employee who raised the ticket can submit feedback.");

        if (!string.Equals(ticket.Status, "Resolved", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(ticket.Status, "Closed", StringComparison.OrdinalIgnoreCase))
        {
            throw new ConflictException("Feedback can only be submitted for resolved or closed tickets.");
        }

        if (ticket.FeedbackRating.HasValue)
        {
            throw new ConflictException("Feedback has already been submitted for this ticket.");
        }

        if (dto.Rating < 1 || dto.Rating > 5)
        {
            throw new ArgumentException("Rating must be between 1 and 5 stars.");
        }

        await _ticketRepository.SubmitFeedbackAsync(ticketId, dto.Rating, dto.Comment?.Trim());
    }

    private void ValidateStatusTransition(string currentStatus, string targetStatus, DateTime referenceDate)
    {
        bool isValid = (currentStatus, targetStatus) switch
        {
            ("Open", "InProgress") => true,
            ("Open", "Closed") => true,
            ("InProgress", "Resolved") => true,
            ("InProgress", "Closed") => true,
            ("Resolved", "Closed") => true,
            ("Resolved", "Open") => (DateTime.UtcNow - referenceDate).TotalDays <= _reopenWindowDays,
            ("Closed", "Open") => (DateTime.UtcNow - referenceDate).TotalDays <= _reopenWindowDays,
            _ => false
        };

        if (!isValid)
        {
            if ((currentStatus == "Resolved" || currentStatus == "Closed") && targetStatus == "Open" && (DateTime.UtcNow - referenceDate).TotalDays > _reopenWindowDays)
            {
                throw new ConflictException($"Cannot reopen ticket after the {_reopenWindowDays}-day window has expired.");
            }
            throw new ConflictException($"Invalid status transition from '{currentStatus}' to '{targetStatus}'.");
        }
    }
}
