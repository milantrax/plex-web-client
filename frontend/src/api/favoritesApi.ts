import axios from 'axios';
import type { Favorite, FavoritePayload, FavoriteType } from '../types';

const api = axios.create({ withCredentials: true });

export const getFavorites = async (type?: FavoriteType | string): Promise<Favorite[]> => {
  const params = type ? { type } : {};
  const res = await api.get<Favorite[]>('/api/favorites', { params });
  return res.data;
};

export const addFavorite = async (item: FavoritePayload): Promise<Favorite> => {
  const res = await api.post<Favorite>('/api/favorites', item);
  return res.data;
};

export const removeFavorite = async (
  type: FavoriteType | string,
  ratingKey: string
): Promise<{ success: boolean }> => {
  const res = await api.delete<{ success: boolean }>(`/api/favorites/${type}/${ratingKey}`);
  return res.data;
};
