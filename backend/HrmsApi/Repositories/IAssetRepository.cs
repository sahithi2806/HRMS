using System.Collections.Generic;
using System.Threading.Tasks;
using HrmsApi.DTOs;
using HrmsApi.Models;

namespace HrmsApi.Repositories;

public interface IAssetRepository
{
    Task<IEnumerable<AssetDto>> GetAllAsync(string? status = null, string? category = null);
    Task<AssetDto?> GetByIdAsync(int assetId);
    Task<Asset?> GetEntityByIdAsync(int assetId);
    Task<Asset?> GetByTagAsync(string assetTag);
    Task<int> CreateAsync(Asset asset);
    Task<bool> UpdateAsync(int assetId, UpdateAssetDto dto);
    Task<bool> UpdateStatusAsync(int assetId, string status);
    Task<bool> AssignAssetAsync(int assetId, int employeeId, int assignedBy);
    Task<bool> UnassignAssetAsync(int assetId);
    Task<IEnumerable<AssetDto>> GetMyAssetsAsync(int employeeId);
    Task<bool> IsAssetAssignedToEmployeeAsync(int assetId, int employeeId);
    Task<int> CreateRequestAsync(AssetRequest request);
    Task<IEnumerable<AssetRequestDto>> GetRequestsAsync(int? employeeId = null);
    Task<AssetRequest?> GetRequestByIdAsync(int requestId);
    Task<bool> UpdateRequestStatusAsync(int requestId, string status, int reviewerId, string? comment);
    Task<bool> CancelRequestAsync(int requestId, int employeeId);
}
