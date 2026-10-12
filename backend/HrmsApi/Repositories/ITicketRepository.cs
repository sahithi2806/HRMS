using System.Collections.Generic;
using System.Threading.Tasks;
using HrmsApi.DTOs;
using HrmsApi.Models;

namespace HrmsApi.Repositories;

public interface ITicketRepository
{
    Task<IEnumerable<TicketDto>> GetTicketsAsync(int? employeeId, string? status = null, string? priority = null, string? category = null);
    Task<TicketDto?> GetTicketByIdAsync(int id);
    Task<IEnumerable<TicketCommentDto>> GetCommentsByTicketIdAsync(int ticketId, bool includeInternal);
    Task<Ticket> CreateTicketAsync(Ticket ticket);
    Task<TicketComment> AddCommentAsync(TicketComment comment);
    Task<bool> UpdateTicketAsync(int ticketId, string? status, int? assignedTo, string? priority, System.DateTime? resolvedAt);
    Task<bool> SubmitFeedbackAsync(int ticketId, int rating, string? comment);
}
