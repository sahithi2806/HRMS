using System.Collections.Generic;
using System.Threading.Tasks;
using HrmsApi.DTOs;

namespace HrmsApi.Services;

public interface IAssetService
{
    Task<IEnumerable<AssetDto>> GetAllAssetsAsync(string? status = null, string? category = null);
    Task<AssetDto> GetAssetByIdAsync(int assetId);
    Task<AssetDto> CreateAssetAsync(CreateAssetDto dto);
    Task<bool> UpdateAssetAsync(int assetId, UpdateAssetDto dto);
    Task<bool> UpdateAssetStatusAsync(int assetId, string status);
    Task<bool> AssignAssetAsync(int assetId, int employeeId, int assignedByAdminId);
    Task<bool> UnassignAssetAsync(int assetId);
    Task<IEnumerable<AssetDto>> GetMyAssetsAsync(int employeeId);
    Task<AssetRequestDto> CreateRequestAsync(int employeeId, CreateAssetRequestDto dto);
    Task<IEnumerable<AssetRequestDto>> GetRequestsAsync(string role, int employeeId);
    Task<bool> ApproveRequestAsync(int requestId, int adminId, ReviewAssetRequestDto? dto);
    Task<bool> RejectRequestAsync(int requestId, int adminId, ReviewAssetRequestDto? dto);
    Task<bool> CancelRequestAsync(int requestId, int employeeId);
}
