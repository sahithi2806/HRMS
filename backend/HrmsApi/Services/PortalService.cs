using System;
using System.Threading.Tasks;
using HrmsApi.DTOs;
using HrmsApi.Helpers;
using HrmsApi.Repositories;
using Microsoft.Extensions.Configuration;

namespace HrmsApi.Services;

public class PortalService : IPortalService
{
    private readonly IPortalRepository _portalRepository;
    private readonly IConfiguration _configuration;

    public PortalService(IPortalRepository portalRepository, IConfiguration configuration)
    {
        _portalRepository = portalRepository;
        _configuration = configuration;
    }

    public async Task<PortalSummaryDto> GetSummaryAsync(int employeeId, string role)
    {
        var tzId = _configuration["Attendance:TimeZone"] ?? "Asia/Kolkata";
        var tz = AttendanceCalculator.ResolveTimeZone(tzId);
        var localNow = AttendanceCalculator.ToLocalTime(DateTime.UtcNow, tz);
        var workDateStr = AttendanceCalculator.GetWorkDate(localNow).ToString("yyyy-MM-dd");

        return await _portalRepository.GetPortalSummaryAsync(employeeId, role, workDateStr);
    }
}
