using System;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using HrmsApi.Data;
using HrmsApi.Helpers;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace HrmsApi.IntegrationTests;

public class TestWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _testDbPath;

    public TestWebApplicationFactory()
    {
        _testDbPath = Path.Combine(Path.GetTempPath(), $"hrms_test_{Guid.NewGuid():N}.db");
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((context, config) =>
        {
            config.AddInMemoryCollection(new[]
            {
                new KeyValuePair<string, string?>("DatabaseProvider", "Sqlite"),
                new KeyValuePair<string, string?>("ConnectionStrings:SqliteConnection", $"Data Source={_testDbPath}"),
                new KeyValuePair<string, string?>("Jwt:Key", "Aether_HRMS_Rotated_Super_Secret_Key_For_Jwt_Auth_2026_Secure!")
            });
        });
    }

    public HttpClient CreateAuthenticatedClient(int userId, string email, string role, int employeeId, string name = "Test User")
    {
        var client = CreateClient();
        var jwtHelper = Services.GetRequiredService<JwtHelper>();
        var user = new Models.User { UserID = userId, Email = email, Role = role, Name = name };
        var token = jwtHelper.GenerateToken(user, employeeId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (File.Exists(_testDbPath))
        {
            try { File.Delete(_testDbPath); } catch { }
        }
    }
}
