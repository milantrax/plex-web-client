import React, { useState, useEffect } from 'react';
import { plexCache } from '../api/plexApi';
import '../styles/CacheManager.scss';

const CacheManager = () => {
  const [cacheStats, setCacheStats] = useState({
    totalSize: 0,
    itemCount: 0,
    items: []
  });
  
  const calculateCacheStats = () => {
    try {
      let totalSize = 0;
      const items = [];
      let count = 0;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        if (key && key.startsWith('plex_')) {
          const value = localStorage.getItem(key);
          const size = (value?.length || 0) * 2; // Approximate size in bytes (UTF-16 encoding)
          totalSize += size;
          count++;
          
          try {
            const parsed = JSON.parse(value);
            items.push({
              key,
              size: (size / 1024).toFixed(2), // Size in KB
              expires: new Date(parsed.expiry).toLocaleString()
            });
          } catch (e) {
          }
        }
      }
      
      setCacheStats({
        totalSize: (totalSize / 1024).toFixed(2),
        itemCount: count,
        items
      });
      
    } catch (error) {
      console.error('Error calculating cache stats:', error);
    }
  };
  
  useEffect(() => {
    calculateCacheStats();
  }, []);
  
  const handleClearAllCache = () => {
    plexCache.clearAllCache();
    calculateCacheStats();
  };
  
  const handleClearCacheItem = (key) => {
    localStorage.removeItem(key);
    calculateCacheStats();
  };
  
  return (
    <div className="cache-manager">
      <h2>Cache Management</h2>
      
      <div className="cache-stats">
        <div className="stat-item">
          <span className="stat-label">Total Cache Size:</span>
          <span className="stat-value">{cacheStats.totalSize} KB</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Cached Items:</span>
          <span className="stat-value">{cacheStats.itemCount}</span>
        </div>
      </div>
      
      <button 
        className="clear-cache-btn"
        onClick={handleClearAllCache}
      >
        Clear All Cache
      </button>
      
      <h3>Cache Details</h3>
      {cacheStats.items.length > 0 ? (
        <div className="cache-items-list">
          {cacheStats.items.map(item => (
            <div key={item.key} className="cache-item">
              <div className="cache-item-info">
                <span className="cache-key">{item.key.replace('plex_', '')}</span>
                <span className="cache-size">{item.size} KB</span>
                <span className="cache-expiry">Expires: {item.expires}</span>
              </div>
              <button
                className="clear-item-btn"
                onClick={() => handleClearCacheItem(item.key)}
              >
                Clear
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p>No cached items found.</p>
      )}
    </div>
  );
};

export default CacheManager;
