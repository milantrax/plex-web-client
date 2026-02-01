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
    <div className="p-0 text-plex-text m-0">
      <h2 className="text-plex-accent mb-5">Cache Management</h2>

      <div className="bg-white/5 rounded-lg p-[15px] mb-[15px] border border-white/10 flex flex-wrap gap-5">
        <div className="flex-1 min-w-[150px]">
          <span className="block text-[0.9em] text-plex-text-secondary mb-1.5">Total Cache Size:</span>
          <span className="text-[1.4em] text-plex-accent font-medium">{cacheStats.totalSize} KB</span>
        </div>
        <div className="flex-1 min-w-[150px]">
          <span className="block text-[0.9em] text-plex-text-secondary mb-1.5">Cached Items:</span>
          <span className="text-[1.4em] text-plex-accent font-medium">{cacheStats.itemCount}</span>
        </div>
      </div>

      <button
        className="bg-plex-danger text-white border-none rounded py-2 px-[15px] cursor-pointer font-medium transition-colors duration-200 ease-in-out hover:bg-[#ff6b7a] mt-[15px]"
        onClick={handleClearAllCache}
      >
        Clear All Cache
      </button>

      <h3 className="text-plex-text my-[25px_0_15px] text-[1.2em]">Cache Details</h3>
      {cacheStats.items.length > 0 ? (
        <div className="bg-white/5 rounded-lg p-[15px] mb-[15px] border border-white/10">
          {cacheStats.items.map(item => (
            <div key={item.key} className="flex justify-between items-center py-2 border-b border-plex-border last:border-b-0">
              <div className="flex flex-col items-start gap-2.5 overflow-hidden">
                <span className="font-medium mb-1">{item.key.replace('plex_', '')}</span>
                <span className="text-[0.85em] text-plex-accent">{item.size} KB</span>
                <span className="text-[0.8em] text-plex-text-secondary">Expires: {item.expires}</span>
              </div>
              <button
                className="bg-plex-danger/70 text-white border-none rounded py-1.5 px-2.5 cursor-pointer font-medium text-[0.9em] transition-colors duration-200 ease-in-out hover:bg-plex-danger/85"
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
