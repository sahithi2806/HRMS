using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HrmsApi.DTOs;
using HrmsApi.Helpers;
using HrmsApi.Models;
using HrmsApi.Repositories;

namespace HrmsApi.Services;

public class AssetService : IAssetService
{
    private readonly IAssetRepository _assetRepository;
    private readonly IEmployeeRepository _employeeRepository;

    private static readonly HashSet<string> ValidCategories = new(StringComparer.OrdinalIgnoreCase)
    {
        "Laptop", "Mobile", "Monitor", "Accessory", "Other"
    };

    private static readonly HashSet<string> ValidStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "Available", "Assigned", "UnderRepair", "Retired"
    };

    public AssetService(IAssetRepository assetRepository, IEmployeeRepository employeeRepository)
    {
        _assetRepository = assetRepository;
        _employeeRepository = employeeRepository;
    }

    public async Task<IEnumerable<AssetDto>> GetAllAssetsAsync(string? status = null, string? category = null)
    {
        return await _assetRepository.GetAllAsync(status, category);
    }

    public async Task<AssetDto> GetAssetByIdAsync(int assetId)
    {
        return await _assetRepository.GetByIdAsync(assetId)
            ?? throw new KeyNotFoundException($"Asset #{assetId} not found.");
    }

    public async Task<AssetDto> CreateAssetAsync(CreateAssetDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.AssetTag))
        {
            throw new ArgumentException("Asset Tag is required.");
        }

        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            throw new ArgumentException("Asset Name is required.");
        }

        if (!ValidCategories.Contains(dto.Category))
        {
            throw new ArgumentException($"Invalid category '{dto.Category}'. Allowed: {string.Join(", ", ValidCategories)}");
        }

        var existing = await _assetRepository.GetByTagAsync(dto.AssetTag.Trim());
        if (existing != null)
        {
            throw new ConflictException($"Asset tag '{dto.AssetTag}' is already registered.");
        }

        var asset = new Asset
        {
            AssetTag = dto.AssetTag.Trim(),
            Name = dto.Name.Trim(),
            Category = dto.Category,
            SerialNumber = dto.SerialNumber?.Trim(),
            PurchaseDate = dto.PurchaseDate,
            Status = "Available"
        };

        var id = await _assetRepository.CreateAsync(asset);
        return await GetAssetByIdAsync(id);
    }

    public async Task<bool> UpdateAssetAsync(int assetId, UpdateAssetDto dto)
    {
        var asset = await _assetRepository.GetEntityByIdAsync(assetId)
            ?? throw new KeyNotFoundException($"Asset #{assetId} not found.");

        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            throw new ArgumentException("Asset Name is required.");
        }

        if (!ValidCategories.Contains(dto.Category))
        {
            throw new ArgumentException($"Invalid category '{dto.Category}'. Allowed: {string.Join(", ", ValidCategories)}");
        }

        return await _assetRepository.UpdateAsync(assetId, dto);
    }

    public async Task<bool> UpdateAssetStatusAsync(int assetId, string status)
    {
        var asset = await _assetRepository.GetEntityByIdAsync(assetId)
            ?? throw new KeyNotFoundException($"Asset #{assetId} not found.");

        if (!ValidStatuses.Contains(status))
        {
            throw new ArgumentException($"Invalid status '{status}'. Allowed: {string.Join(", ", ValidStatuses)}");
        }

        return await _assetRepository.UpdateStatusAsync(assetId, status);
    }

    public async Task<bool> AssignAssetAsync(int assetId, int employeeId, int assignedByAdminId)
    {
        var asset = await _assetRepository.GetEntityByIdAsync(assetId)
            ?? throw new KeyNotFoundException($"Asset #{assetId} not found.");

        if (asset.Status != "Available")
        {
            throw new ConflictException($"Cannot assign asset in '{asset.Status}' status. Must be 'Available'.");
        }

        var employee = await _employeeRepository.GetEmployeeByIdAsync(employeeId)
            ?? throw new KeyNotFoundException($"Employee #{employeeId} not found.");

        if (employee.Status != "Active")
        {
            throw new ConflictException("Cannot assign asset to an inactive employee.");
        }

        try
        {
            var success = await _assetRepository.AssignAssetAsync(assetId, employeeId, assignedByAdminId);
            if (!success)
            {
                throw new ConflictException("Asset assignment failed. Asset is no longer available.");
            }
            return true;
        }
        catch (Exception ex) when (ex is not ConflictException)
        {
            // Catches filtered unique index violation or DB errors
            throw new ConflictException("Asset assignment failed: Asset already has an active open assignment.");
        }
    }

    public async Task<bool> UnassignAssetAsync(int assetId)
    {
        var asset = await _assetRepository.GetEntityByIdAsync(assetId)
            ?? throw new KeyNotFoundException($"Asset #{assetId} not found.");

        var unassigned = await _assetRepository.UnassignAssetAsync(assetId);
        if (!unassigned)
        {
            throw new ConflictException("Asset does not have an active assignment to unassign.");
        }
        return true;
    }

    public async Task<IEnumerable<AssetDto>> GetMyAssetsAsync(int employeeId)
    {
        return await _assetRepository.GetMyAssetsAsync(employeeId);
    }

    public async Task<AssetRequestDto> CreateRequestAsync(int employeeId, CreateAssetRequestDto dto)
    {
        if (dto.AssetID <= 0)
        {
            throw new ArgumentException("A valid AssetID is required.");
        }

        var isHeld = await _assetRepository.IsAssetAssignedToEmployeeAsync(dto.AssetID, employeeId);
        if (!isHeld)
        {
            throw new InvalidOperationException("You can only raise requests for assets currently assigned to you.");
        }

        if (dto.RequestType != "Repair" && dto.RequestType != "Return")
        {
            throw new ArgumentException("RequestType must be 'Repair' or 'Return'.");
        }

        if (string.IsNullOrWhiteSpace(dto.Description))
        {
            throw new ArgumentException("Description is required.");
        }

        // Check if there is already an active pending request for this asset
        var pendingRequests = await _assetRepository.GetRequestsAsync(employeeId);
        if (pendingRequests.Any(r => r.AssetID == dto.AssetID && r.Status == "Pending"))
        {
            throw new ConflictException("There is already a pending request for this asset.");
        }

        // Check asset state
        var asset = await _assetRepository.GetByIdAsync(dto.AssetID);
        if (asset != null && asset.Status == "UnderRepair" && dto.RequestType == "Repair")
        {
            throw new ConflictException("This asset is already marked as Under Repair.");
        }
        if (asset != null && asset.Status == "Retired")
        {
            throw new InvalidOperationException("Cannot raise requests for retired assets.");
        }

        var request = new AssetRequest
        {
            AssetID = dto.AssetID,
            EmployeeID = employeeId,
            RequestType = dto.RequestType,
            Description = dto.Description.Trim(),
            Status = "Pending"
        };

        var id = await _assetRepository.CreateRequestAsync(request);
        var requests = await _assetRepository.GetRequestsAsync(employeeId);
        var created = requests.FirstOrDefault(r => r.AssetRequestID == id);
        if (created == null)
        {
            throw new KeyNotFoundException($"Created asset request #{id} could not be retrieved.");
        }
        return created;
    }

    public async Task<IEnumerable<AssetRequestDto>> GetRequestsAsync(string role, int employeeId)
    {
        if (role == "Admin")
        {
            return await _assetRepository.GetRequestsAsync();
        }
        return await _assetRepository.GetRequestsAsync(employeeId);
    }

    public async Task<bool> ApproveRequestAsync(int requestId, int adminId, ReviewAssetRequestDto? dto)
    {
        var request = await _assetRepository.GetRequestByIdAsync(requestId)
            ?? throw new KeyNotFoundException($"Asset request #{requestId} not found.");

        if (request.Status != "Pending")
        {
            throw new InvalidOperationException($"Cannot approve request with status '{request.Status}'.");
        }

        if (request.RequestType == "Return")
        {
            // Closes assignment and marks asset Available
            await _assetRepository.UnassignAssetAsync(request.AssetID);
        }
        else if (request.RequestType == "Repair")
        {
            // Marks asset as UnderRepair
            await _assetRepository.UpdateStatusAsync(request.AssetID, "UnderRepair");
        }

        var updated = await _assetRepository.UpdateRequestStatusAsync(requestId, "Approved", adminId, dto?.Comment);
        if (!updated)
        {
            throw new ConflictException("Request has already been reviewed.");
        }

        return true;
    }

    public async Task<bool> RejectRequestAsync(int requestId, int adminId, ReviewAssetRequestDto? dto)
    {
        var request = await _assetRepository.GetRequestByIdAsync(requestId)
            ?? throw new KeyNotFoundException($"Asset request #{requestId} not found.");

        if (request.Status != "Pending")
        {
            throw new InvalidOperationException($"Cannot reject request with status '{request.Status}'.");
        }

        var updated = await _assetRepository.UpdateRequestStatusAsync(requestId, "Rejected", adminId, dto?.Comment);
        if (!updated)
        {
            throw new ConflictException("Request has already been reviewed.");
        }

        return true;
    }

    public async Task<bool> CancelRequestAsync(int requestId, int employeeId)
    {
        var request = await _assetRepository.GetRequestByIdAsync(requestId)
            ?? throw new KeyNotFoundException($"Asset request #{requestId} not found.");

        if (request.EmployeeID != employeeId)
        {
            throw new UnauthorizedAccessException("You can only cancel your own asset request.");
        }

        if (request.Status != "Pending")
        {
            throw new InvalidOperationException($"Cannot cancel request with status '{request.Status}'.");
        }

        var cancelled = await _assetRepository.CancelRequestAsync(requestId, employeeId);
        if (!cancelled)
        {
            throw new ConflictException("Could not cancel request. It may have already been reviewed.");
        }

        return true;
    }
}
