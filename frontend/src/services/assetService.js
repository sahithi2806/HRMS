import api from './api';

export const assetService = {
  getAllAssets: async (status, category) => {
    const params = {};
    if (status) params.status = status;
    if (category) params.category = category;
    const response = await api.get('/assets', { params });
    return response.data;
  },

  getAssetById: async (id) => {
    const response = await api.get(`/assets/${id}`);
    return response.data;
  },

  createAsset: async (data) => {
    const payload = {
      assetTag: data.assetTag || data.AssetTag,
      name: data.name || data.Name,
      category: data.category || data.Category,
      serialNumber: data.serialNumber || data.SerialNumber || null,
      purchaseDate: data.purchaseDate || data.PurchaseDate || null
    };
    const response = await api.post('/assets', payload);
    return response.data;
  },

  updateAsset: async (id, data) => {
    const response = await api.put(`/assets/${id}`, data);
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await api.patch(`/assets/${id}/status`, { status });
    return response.data;
  },

  assignAsset: async (id, employeeId) => {
    const empId = Number(employeeId);
    const response = await api.post(`/assets/${id}/assign`, {
      EmployeeID: empId,
      employeeId: empId
    });
    return response.data;
  },

  unassignAsset: async (id) => {
    const response = await api.post(`/assets/${id}/unassign`);
    return response.data;
  },

  getMyAssets: async () => {
    const response = await api.get('/assets/mine');
    return response.data;
  },

  createRequest: async (data) => {
    const assetId = Number(data.assetID ?? data.assetId ?? data.AssetID);
    const payload = {
      AssetID: assetId,
      assetId: assetId,
      RequestType: data.requestType || data.RequestType,
      Description: (data.description || data.Description || '').trim()
    };
    const response = await api.post('/assets/requests', payload);
    return response.data;
  },

  getRequests: async () => {
    const response = await api.get('/assets/requests');
    return response.data;
  },

  approveRequest: async (id, comment) => {
    const response = await api.put(`/assets/requests/${id}/approve`, { comment });
    return response.data;
  },

  rejectRequest: async (id, comment) => {
    const response = await api.put(`/assets/requests/${id}/reject`, { comment });
    return response.data;
  },

  cancelRequest: async (id) => {
    const response = await api.put(`/assets/requests/${id}/cancel`);
    return response.data;
  }
};
