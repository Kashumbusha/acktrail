import apiClient from '../api/client';

export const usersAPI = {
  list: async (type = 'staff', search = '', page = 1, per_page = 20) => {
    const res = await apiClient.get('/api/users/', { params: { type, search, page, per_page } });
    return res.data;
  },
};

export default usersAPI;


