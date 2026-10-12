using System.Collections.Generic;
using System.Threading.Tasks;
using HrmsApi.DTOs;

namespace HrmsApi.Services;

public interface ITicketService
{
    Task<IEnumerable<TicketDto>> GetTicketsAsync(string role, int employeeId, string? status = null, string? priority = null, string? category = null);
    Task<TicketDto> GetTicketByIdAsync(int ticketId, string role, int employeeId);
    Task<TicketDto> CreateTicketAsync(int employeeId, CreateTicketDto dto);
    Task<TicketCommentDto> AddCommentAsync(int ticketId, int authorEmployeeId, string role, CreateCommentDto dto);
    Task UpdateTicketAsync(int ticketId, string role, UpdateTicketDto dto);
    Task CloseTicketAsync(int ticketId, string role, int employeeId);
    Task ReopenTicketAsync(int ticketId, string role, int employeeId);
    Task SubmitFeedbackAsync(int ticketId, int employeeId, TicketFeedbackDto dto);
}
