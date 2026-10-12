using System;
using System.Threading.Tasks;
using HrmsApi.DTOs;
using HrmsApi.Helpers;
using HrmsApi.Models;
using HrmsApi.Repositories;
using HrmsApi.Services;
using Moq;
using Xunit;

namespace HrmsApi.Tests;

public class AssetServiceTests
{
    private readonly Mock<IAssetRepository> _assetRepoMock = new();
    private readonly Mock<IEmployeeRepository> _employeeRepoMock = new();
    private readonly AssetService _service;

    public AssetServiceTests()
    {
        _service = new AssetService(_assetRepoMock.Object, _employeeRepoMock.Object);
    }

    [Fact]
    public async Task CreateAsset_ThrowsConflict_WhenAssetTagAlreadyExists()
    {
        var dto = new CreateAssetDto
        {
            AssetTag = "AST-LP-001",
            Name = "MacBook Pro",
            Category = "Laptop"
        };

        _assetRepoMock.Setup(r => r.GetByTagAsync("AST-LP-001"))
            .ReturnsAsync(new Asset { AssetID = 1, AssetTag = "AST-LP-001" });

        await Assert.ThrowsAsync<ConflictException>(() => _service.CreateAssetAsync(dto));
    }

    [Fact]
    public async Task AssignAsset_ThrowsConflict_WhenAssetNotAvailable()
    {
        int assetId = 1;
        int employeeId = 8;
        int adminId = 1;

        _assetRepoMock.Setup(r => r.GetEntityByIdAsync(assetId))
            .ReturnsAsync(new Asset { AssetID = assetId, Status = "Assigned" });

        await Assert.ThrowsAsync<ConflictException>(() => _service.AssignAssetAsync(assetId, employeeId, adminId));
    }

    [Fact]
    public async Task CreateRequest_ThrowsInvalidOperation_WhenAssetNotAssignedToCaller()
    {
        int employeeId = 8;
        var dto = new CreateAssetRequestDto
        {
            AssetID = 4, // Not held by employee 8
            RequestType = "Repair",
            Description = "Keyboard issue"
        };

        _assetRepoMock.Setup(r => r.IsAssetAssignedToEmployeeAsync(dto.AssetID, employeeId))
            .ReturnsAsync(false);

        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.CreateRequestAsync(employeeId, dto));
    }

    [Fact]
    public async Task ApproveRequest_Return_UnassignsAssetAndFreesInventory()
    {
        int requestId = 10;
        int assetId = 3;
        int adminId = 1;

        var request = new AssetRequest
        {
            AssetRequestID = requestId,
            AssetID = assetId,
            EmployeeID = 8,
            RequestType = "Return",
            Status = "Pending"
        };

        _assetRepoMock.Setup(r => r.GetRequestByIdAsync(requestId)).ReturnsAsync(request);
        _assetRepoMock.Setup(r => r.UnassignAssetAsync(assetId)).ReturnsAsync(true);
        _assetRepoMock.Setup(r => r.UpdateRequestStatusAsync(requestId, "Approved", adminId, It.IsAny<string>()))
            .ReturnsAsync(true);

        var result = await _service.ApproveRequestAsync(requestId, adminId, new ReviewAssetRequestDto { Comment = "Return accepted" });

        Assert.True(result);
        _assetRepoMock.Verify(r => r.UnassignAssetAsync(assetId), Times.Once);
    }

    [Fact]
    public async Task ApproveRequest_Repair_SetsAssetStatusToUnderRepair()
    {
        int requestId = 11;
        int assetId = 3;
        int adminId = 1;

        var request = new AssetRequest
        {
            AssetRequestID = requestId,
            AssetID = assetId,
            EmployeeID = 8,
            RequestType = "Repair",
            Status = "Pending"
        };

        _assetRepoMock.Setup(r => r.GetRequestByIdAsync(requestId)).ReturnsAsync(request);
        _assetRepoMock.Setup(r => r.UpdateStatusAsync(assetId, "UnderRepair")).ReturnsAsync(true);
        _assetRepoMock.Setup(r => r.UpdateRequestStatusAsync(requestId, "Approved", adminId, It.IsAny<string>()))
            .ReturnsAsync(true);

        var result = await _service.ApproveRequestAsync(requestId, adminId, new ReviewAssetRequestDto { Comment = "Sent to service center" });

        Assert.True(result);
        _assetRepoMock.Verify(r => r.UpdateStatusAsync(assetId, "UnderRepair"), Times.Once);
    }
}
