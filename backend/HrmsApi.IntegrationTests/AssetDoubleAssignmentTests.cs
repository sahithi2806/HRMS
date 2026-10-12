using System.Net;
using System.Net.Http.Json;
using System.Threading.Tasks;
using HrmsApi.DTOs;
using HrmsApi.Repositories;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace HrmsApi.IntegrationTests;

public class AssetDoubleAssignmentTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public AssetDoubleAssignmentTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task AssignAsset_SecondAssignment_Throws409Conflict_EnforcedByFilteredUniqueIndex()
    {
        // Admin user (UserID 1, EmployeeID 1, Role 'Admin')
        var adminClient = _factory.CreateAuthenticatedClient(1, "admin@hrms.com", "Admin", 1, "Admin");

        // 1. Create a fresh available asset
        var createAssetDto = new CreateAssetDto
        {
            AssetTag = $"AST-TEST-{System.Guid.NewGuid():N}".Substring(0, 15),
            Name = "Integration Test MacBook",
            Category = "Laptop"
        };
        var createRes = await adminClient.PostAsJsonAsync("/api/assets", createAssetDto);
        createRes.EnsureSuccessStatusCode();
        var createdAsset = await createRes.Content.ReadFromJsonAsync<AssetDto>();
        Assert.NotNull(createdAsset);
        int assetId = createdAsset.AssetID;

        // 2. First assignment to Employee 8 -> Succeeds
        var assignRes1 = await adminClient.PostAsJsonAsync($"/api/assets/{assetId}/assign", new AssignAssetDto { EmployeeID = 8 });
        Assert.Equal(HttpStatusCode.OK, assignRes1.StatusCode);

        // 3. Second assignment of the exact same asset to Employee 9 without unassigning -> Fails with 409 Conflict
        var assignRes2 = await adminClient.PostAsJsonAsync($"/api/assets/{assetId}/assign", new AssignAssetDto { EmployeeID = 9 });
        Assert.Equal(HttpStatusCode.Conflict, assignRes2.StatusCode);
    }
}
