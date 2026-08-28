import axios from 'axios';

const api = axios.create({ withCredentials: true });

export const getFavorites = async (type) => {
  const params = type ? { type } : {};
  const res = await api.get('/api/favorites', { params });
  return res.data;
};

export const addFavorite = async (item) => {
  const res = await api.post('/api/favorites', item);
  return res.data;
};

export const removeFavorite = async (type, ratingKey) => {
  const res = await api.delete(`/api/favorites/${type}/${ratingKey}`);
  return res.data;
};
