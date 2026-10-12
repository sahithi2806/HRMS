import api from './api';

export const attendanceService = {
  checkIn: async () => {
    const response = await api.post('/attendance/check-in');
    return response.data;
  },

  checkOut: async () => {
    const response = await api.post('/attendance/check-out');
    return response.data;
  },

  getToday: async () => {
    const response = await api.get('/attendance/today');
    return response.data;
  },

  getMyMonthly: async (month) => {
    const params = month ? { month } : {};
    const response = await api.get('/attendance/my', { params });
    return response.data;
  },

  getTeamAttendance: async (date) => {
    const params = date ? { date } : {};
    const response = await api.get('/attendance/team', { params });
    return response.data;
  },

  getRegularizations: async () => {
    const response = await api.get('/attendance/regularizations');
    return response.data;
  },

  createRegularization: async (data) => {
    const response = await api.post('/attendance/regularizations', data);
    return response.data;
  },

  approveRegularization: async (id, comment) => {
    const response = await api.put(`/attendance/regularizations/${id}/approve`, { comment });
    return response.data;
  },

  rejectRegularization: async (id, comment) => {
    const response = await api.put(`/attendance/regularizations/${id}/reject`, { comment });
    return response.data;
  },

  cancelRegularization: async (id) => {
    const response = await api.put(`/attendance/regularizations/${id}/cancel`);
    return response.data;
  }
};
