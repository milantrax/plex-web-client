import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getFavorites, addFavorite, removeFavorite } from '../api/favoritesApi';

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const [favoritesMap, setFavoritesMap] = useState(new Map());

  useEffect(() => {
    getFavorites()
      .then(items => {
        const map = new Map();
        items.forEach(item => map.set(`${item.type}:${item.rating_key}`, item));
        setFavoritesMap(map);
      })
      .catch(() => {});
  }, []);

  const isFavorite = useCallback((type, ratingKey) => {
    return favoritesMap.has(`${type}:${String(ratingKey)}`);
  }, [favoritesMap]);

  const toggleFavorite = useCallback(async (type, item) => {
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
          next.set(key, favoritesMap.get(key));
          return next;
        });
      }
    } else {
      const payload = {
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
      const optimistic = { ...payload, rating_key: payload.ratingKey, part_key: payload.partKey, parent_rating_key: payload.parentRatingKey };
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

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
