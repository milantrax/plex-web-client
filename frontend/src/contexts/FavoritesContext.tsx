import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getFavorites, addFavorite, removeFavorite } from '../api/favoritesApi';
import type { Favorite, FavoriteInput, FavoritePayload, FavoriteType } from '../types';

export interface FavoritesContextValue {
  favorites: Favorite[];
  isFavorite: (type: FavoriteType | string, ratingKey: string | number) => boolean;
  toggleFavorite: (type: FavoriteType | string, item: FavoriteInput) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoritesMap, setFavoritesMap] = useState<Map<string, Favorite>>(new Map());

  useEffect(() => {
    getFavorites()
      .then(items => {
        const map = new Map<string, Favorite>();
        items.forEach(item => map.set(`${item.type}:${item.rating_key}`, item));
        setFavoritesMap(map);
      })
      .catch(() => {});
  }, []);

  const isFavorite = useCallback((type: FavoriteType | string, ratingKey: string | number) => {
    return favoritesMap.has(`${type}:${String(ratingKey)}`);
  }, [favoritesMap]);

  const toggleFavorite = useCallback(async (type: FavoriteType | string, item: FavoriteInput) => {
    const key = `${type}:${String(item.ratingKey)}`;
    const alreadyFavorited = favoritesMap.has(key);

    if (alreadyFavorited) {
      // Optimistic remove
      setFavoritesMap(prev => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
      try {
        await removeFavorite(type, String(item.ratingKey));
      } catch {
        // Revert on error
        setFavoritesMap(prev => {
          const next = new Map(prev);
          const previous = favoritesMap.get(key);
          if (previous) next.set(key, previous);
          return next;
        });
      }
    } else {
      const payload: FavoritePayload = {
        type,
        ratingKey: String(item.ratingKey),
        title: item.title || null,
        thumb: item.thumb || null,
        subtitle: item.subtitle || null,
        year: item.year || null,
        duration: item.duration || null,
        partKey: item.partKey || null,
        parentRatingKey: item.parentRatingKey ? String(item.parentRatingKey) : null,
      };
      // Optimistic add
      const optimistic: Favorite = {
        ...payload,
        rating_key: payload.ratingKey,
        part_key: payload.partKey,
        parent_rating_key: payload.parentRatingKey
      };
      setFavoritesMap(prev => {
        const next = new Map(prev);
        next.set(key, optimistic);
        return next;
      });
      try {
        const saved = await addFavorite(payload);
        setFavoritesMap(prev => {
          const next = new Map(prev);
          next.set(key, saved);
          return next;
        });
      } catch {
        // Revert on error
        setFavoritesMap(prev => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      }
    }
  }, [favoritesMap]);

  const favorites = Array.from(favoritesMap.values());

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
