import api from './api';

export const ticketService = {
  getTickets: async (params = {}) => {
    const response = await api.get('/tickets', { params });
    return response.data;
  },

  getTicketById: async (id) => {
    const response = await api.get(`/tickets/${id}`);
    return response.data;
  },

  createTicket: async (data) => {
    const response = await api.post('/tickets', data);
    return response.data;
  },

  addComment: async (id, data) => {
    const response = await api.post(`/tickets/${id}/comments`, data);
    return response.data;
  },

  updateTicket: async (id, data) => {
    const response = await api.patch(`/tickets/${id}`, data);
    return response.data;
  },

  closeTicket: async (id) => {
    const response = await api.put(`/tickets/${id}/close`);
    return response.data;
  },

  reopenTicket: async (id) => {
    const response = await api.put(`/tickets/${id}/reopen`);
    return response.data;
  },

  submitFeedback: async (id, data) => {
    const response = await api.post(`/tickets/${id}/feedback`, data);
    return response.data;
  }
};
