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
    const response = await api.post('/assets', data);
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
    const response = await api.post(`/assets/${id}/assign`, { employeeId });
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
    const response = await api.post('/assets/requests', data);
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
