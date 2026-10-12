using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using HrmsApi.DTOs;
using HrmsApi.Helpers;
using HrmsApi.Models;
using HrmsApi.Repositories;
using HrmsApi.Services;
using Microsoft.Extensions.Configuration;
using Moq;
using Xunit;

namespace HrmsApi.Tests;

public class TicketServiceTests
{
    private readonly Mock<ITicketRepository> _ticketRepoMock = new();
    private readonly IConfiguration _config;
    private readonly TicketService _service;

    public TicketServiceTests()
    {
        var configBuilder = new ConfigurationBuilder();
        configBuilder.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Helpdesk:ReopenWindowDays"] = "7"
        });
        _config = configBuilder.Build();
        _service = new TicketService(_ticketRepoMock.Object, _config);
    }

    [Fact]
    public async Task GetTickets_FiltersToOwnTickets_ForNonAdminEmployee()
    {
        int employeeId = 8;
        string role = "Employee";

        _ticketRepoMock.Setup(r => r.GetTicketsAsync(employeeId, null, null, null))
            .ReturnsAsync(new List<TicketDto>());

        await _service.GetTicketsAsync(role, employeeId);

        _ticketRepoMock.Verify(r => r.GetTicketsAsync(employeeId, null, null, null), Times.Once);
    }

    [Fact]
    public async Task GetTickets_ReturnsAllTickets_ForAdmin()
    {
        int employeeId = 1;
        string role = "Admin";

        _ticketRepoMock.Setup(r => r.GetTicketsAsync(null, null, null, null))
            .ReturnsAsync(new List<TicketDto>());

        await _service.GetTicketsAsync(role, employeeId);

        _ticketRepoMock.Verify(r => r.GetTicketsAsync(null, null, null, null), Times.Once);
    }

    [Fact]
    public async Task GetTicketById_NeverReturnsInternalComments_ToEmployeeRaiser()
    {
        int ticketId = 10;
        int employeeId = 8;
        string role = "Employee";

        _ticketRepoMock.Setup(r => r.GetTicketByIdAsync(ticketId))
            .ReturnsAsync(new TicketDto { TicketID = ticketId, EmployeeID = employeeId, Status = "Open" });

        _ticketRepoMock.Setup(r => r.GetCommentsByTicketIdAsync(ticketId, false))
            .ReturnsAsync(new List<TicketCommentDto>
            {
                new TicketCommentDto { CommentID = 1, TicketID = ticketId, Body = "Public update", IsInternal = false }
            });

        var result = await _service.GetTicketByIdAsync(ticketId, role, employeeId);

        _ticketRepoMock.Verify(r => r.GetCommentsByTicketIdAsync(ticketId, false), Times.Once);
        _ticketRepoMock.Verify(r => r.GetCommentsByTicketIdAsync(ticketId, true), Times.Never);
        Assert.Single(result.Comments!);
        Assert.False(result.Comments![0].IsInternal);
    }

    [Fact]
    public async Task GetTicketById_ReturnsInternalComments_ToAdmin()
    {
        int ticketId = 10;
        int adminId = 1;
        string role = "Admin";

        _ticketRepoMock.Setup(r => r.GetTicketByIdAsync(ticketId))
            .ReturnsAsync(new TicketDto { TicketID = ticketId, EmployeeID = 8, Status = "Open" });

        _ticketRepoMock.Setup(r => r.GetCommentsByTicketIdAsync(ticketId, true))
            .ReturnsAsync(new List<TicketCommentDto>
            {
                new TicketCommentDto { CommentID = 1, TicketID = ticketId, Body = "Public update", IsInternal = false },
                new TicketCommentDto { CommentID = 2, TicketID = ticketId, Body = "Private triage notes", IsInternal = true }
            });

        var result = await _service.GetTicketByIdAsync(ticketId, role, adminId);

        _ticketRepoMock.Verify(r => r.GetCommentsByTicketIdAsync(ticketId, true), Times.Once);
        Assert.Equal(2, result.Comments!.Count);
    }

    [Fact]
    public async Task GetTicketById_ThrowsUnauthorized_WhenEmployeeNotOwner()
    {
        int ticketId = 10;
        int employeeId = 9; // Not ticket owner
        string role = "Employee";

        _ticketRepoMock.Setup(r => r.GetTicketByIdAsync(ticketId))
            .ReturnsAsync(new TicketDto { TicketID = ticketId, EmployeeID = 8, Status = "Open" });

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => _service.GetTicketByIdAsync(ticketId, role, employeeId));
    }

    [Fact]
    public async Task UpdateTicket_ThrowsConflict_OnInvalidStatusTransition()
    {
        int ticketId = 10;
        string role = "Admin";

        _ticketRepoMock.Setup(r => r.GetTicketByIdAsync(ticketId))
            .ReturnsAsync(new TicketDto { TicketID = ticketId, Status = "Open" });

        // Open -> Resolved directly is invalid per transition table (must go through InProgress)
        var dto = new UpdateTicketDto { Status = "Resolved" };

        await Assert.ThrowsAsync<ConflictException>(() => _service.UpdateTicketAsync(ticketId, role, dto));
    }

    [Fact]
    public async Task UpdateTicket_ThrowsUnauthorized_WhenNonAdmin()
    {
        int ticketId = 10;
        string role = "Employee";
        var dto = new UpdateTicketDto { Status = "InProgress" };

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => _service.UpdateTicketAsync(ticketId, role, dto));
    }

    [Fact]
    public async Task SubmitFeedback_ThrowsConflict_WhenTicketNotResolvedOrClosed()
    {
        int ticketId = 10;
        int employeeId = 8;

        _ticketRepoMock.Setup(r => r.GetTicketByIdAsync(ticketId))
            .ReturnsAsync(new TicketDto { TicketID = ticketId, EmployeeID = employeeId, Status = "InProgress" });

        var dto = new TicketFeedbackDto { Rating = 5, Comment = "Great job" };

        await Assert.ThrowsAsync<ConflictException>(() => _service.SubmitFeedbackAsync(ticketId, employeeId, dto));
    }

    [Fact]
    public async Task SubmitFeedback_ThrowsConflict_WhenFeedbackAlreadySubmitted()
    {
        int ticketId = 10;
        int employeeId = 8;

        _ticketRepoMock.Setup(r => r.GetTicketByIdAsync(ticketId))
            .ReturnsAsync(new TicketDto {
                TicketID = ticketId,
                EmployeeID = employeeId,
                Status = "Resolved",
                FeedbackRating = 4 // Already rated once
            });

        var dto = new TicketFeedbackDto { Rating = 5, Comment = "Rating again" };

        await Assert.ThrowsAsync<ConflictException>(() => _service.SubmitFeedbackAsync(ticketId, employeeId, dto));
    }

    [Fact]
    public async Task ReopenTicket_ThrowsConflict_WhenBeyondReopenWindow()
    {
        int ticketId = 10;
        int employeeId = 8;
        string role = "Employee";

        _ticketRepoMock.Setup(r => r.GetTicketByIdAsync(ticketId))
            .ReturnsAsync(new TicketDto
            {
                TicketID = ticketId,
                EmployeeID = employeeId,
                Status = "Resolved",
                ResolvedAt = DateTime.UtcNow.AddDays(-10), // 10 days ago (> 7 days)
                UpdatedAt = DateTime.UtcNow.AddDays(-10)
            });

        await Assert.ThrowsAsync<ConflictException>(() => _service.ReopenTicketAsync(ticketId, role, employeeId));
    }

    [Fact]
    public async Task ReopenTicket_Succeeds_WhenWithinReopenWindow()
    {
        int ticketId = 10;
        int employeeId = 8;
        string role = "Employee";

        _ticketRepoMock.Setup(r => r.GetTicketByIdAsync(ticketId))
            .ReturnsAsync(new TicketDto
            {
                TicketID = ticketId,
                EmployeeID = employeeId,
                Status = "Resolved",
                ResolvedAt = DateTime.UtcNow.AddDays(-2), // 2 days ago (<= 7 days)
                UpdatedAt = DateTime.UtcNow.AddDays(-2)
            });

        _ticketRepoMock.Setup(r => r.UpdateTicketAsync(ticketId, "Open", null, null, null))
            .ReturnsAsync(true);

        await _service.ReopenTicketAsync(ticketId, role, employeeId);

        _ticketRepoMock.Verify(r => r.UpdateTicketAsync(ticketId, "Open", null, null, null), Times.Once);
    }
}
