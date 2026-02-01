import React, { useState, useEffect } from 'react';
import { plexCache } from '../api/plexApi';

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
    <div className="p-0 text-base-content m-0">
      <h2 className="text-primary mb-5">Cache Management</h2>

      <div className="stats shadow bg-base-200 mb-4">
        <div className="stat">
          <div className="stat-title">Total Cache Size</div>
          <div className="stat-value text-primary">{cacheStats.totalSize} KB</div>
        </div>
        <div className="stat">
          <div className="stat-title">Cached Items</div>
          <div className="stat-value text-primary">{cacheStats.itemCount}</div>
        </div>
      </div>

      <button
        className="btn btn-error mt-4"
        onClick={handleClearAllCache}
      >
        Clear All Cache
      </button>

      <h3 className="text-base-content my-6 text-[1.2em]">Cache Details</h3>
      {cacheStats.items.length > 0 ? (
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body p-4">
            {cacheStats.items.map(item => (
              <div key={item.key} className="flex justify-between items-center py-2 border-b border-base-300 last:border-b-0">
                <div className="flex flex-col items-start gap-1 overflow-hidden">
                  <span className="font-medium mb-1">{item.key.replace('plex_', '')}</span>
                  <span className="text-[0.85em] text-primary">{item.size} KB</span>
                  <span className="text-[0.8em] text-base-content/60">Expires: {item.expires}</span>
                </div>
                <button
                  className="btn btn-error btn-sm"
                  onClick={() => handleClearCacheItem(item.key)}
                >
                  Clear
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p>No cached items found.</p>
      )}
    </div>
  );
};

export default CacheManager;
