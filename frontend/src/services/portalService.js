import api from './api';

export const portalService = {
  getSummary: async () => {
    const response = await api.get('/portal/summary');
    return response.data;
  }
};
