import React, { useState, useEffect } from 'react';
import { plexCache } from '../api/plexApi';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Stack,
  Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

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
          const size = (value?.length || 0) * 2;
          totalSize += size;
          count++;

          try {
            const parsed = JSON.parse(value);
            items.push({
              key,
              size: (size / 1024).toFixed(2),
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
    <Box sx={{ p: 0, m: 0 }}>
      <Typography variant="h5" sx={{ color: 'primary.main', mb: 3, fontWeight: 700 }}>
        Cache Management
      </Typography>

      <Card sx={{ mb: 2, bgcolor: 'background.paper' }}>
        <CardContent>
          <Stack direction="row" spacing={4}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Total Cache Size
              </Typography>
              <Typography variant="h5" color="primary" sx={{ fontWeight: 700 }}>
                {cacheStats.totalSize} KB
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Cached Items
              </Typography>
              <Typography variant="h5" color="primary" sx={{ fontWeight: 700 }}>
                {cacheStats.itemCount}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Button
        variant="contained"
        color="error"
        onClick={handleClearAllCache}
        sx={{ mt: 2, mb: 4 }}
      >
        Clear All Cache
      </Button>

      <Typography variant="h6" sx={{ my: 3 }}>
        Cache Details
      </Typography>

      {cacheStats.items.length > 0 ? (
        <Card sx={{ bgcolor: 'background.paper' }}>
          <CardContent sx={{ p: 2 }}>
            {cacheStats.items.map((item, index) => (
              <React.Fragment key={item.key}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 1.5,
                  }}
                >
                  <Box sx={{ flex: 1, overflow: 'hidden', mr: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {item.key.replace('plex_', '')}
                    </Typography>
                    <Typography variant="caption" color="primary">
                      {item.size} KB
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Expires: {item.expires}
                    </Typography>
                  </Box>
                  <IconButton
                    color="error"
                    size="small"
                    onClick={() => handleClearCacheItem(item.key)}
                    aria-label="Clear cache item"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
                {index < cacheStats.items.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No cached items found.
        </Typography>
      )}
    </Box>
  );
};

export default CacheManager;
