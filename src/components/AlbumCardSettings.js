// src/components/AlbumCardSettings.js
import React, { useState, useEffect } from 'react';
import { getAlbumCardWidth, setAlbumCardWidth, resetAlbumCardWidth } from '../utils/settingsStorage';
import {
  Box,
  Typography,
  Slider,
  Button,
  Stack,
  Card,
  CardContent
} from '@mui/material';

const AlbumCardSettings = () => {
  const [width, setWidth] = useState(getAlbumCardWidth());
  const [isChanged, setIsChanged] = useState(false);

  useEffect(() => {
    const defaultWidth = 180;
    setIsChanged(width !== defaultWidth);
  }, [width]);

  const handleWidthChange = (e, newValue) => {
    const newWidth = newValue;
    setWidth(newWidth);
    setAlbumCardWidth(newWidth);

    window.dispatchEvent(new CustomEvent('albumCardWidthChanged', {
      detail: { width: newWidth }
    }));
  };

  const handleReset = () => {
    const defaultWidth = 180;
    setWidth(defaultWidth);
    resetAlbumCardWidth();

    window.dispatchEvent(new CustomEvent('albumCardWidthChanged', {
      detail: { width: defaultWidth }
    }));
  };

  return (
    <Box sx={{ maxWidth: 400 }}>
      <Stack spacing={3}>
        <Typography variant="h5" component="h3" sx={{ fontWeight: 700 }}>
          Album Card Settings
        </Typography>

        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Album Card Width:
            </Typography>
            <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
              {width}px
            </Typography>
          </Box>

          <Slider
            value={width}
            onChange={handleWidthChange}
            min={120}
            max={300}
            step={10}
            marks={[
              { value: 120, label: '120px' },
              { value: 210, label: '210px' },
              { value: 300, label: '300px' },
            ]}
            valueLabelDisplay="auto"
            color="primary"
          />

          {isChanged && (
            <Button
              onClick={handleReset}
              variant="outlined"
              size="small"
              sx={{ mt: 2 }}
            >
              Reset to Default (180px)
            </Button>
          )}
        </Box>

        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 2 }}>
            Preview:
          </Typography>
          <Card
            sx={{
              width: width,
              boxShadow: 2,
            }}
          >
            <Box
              sx={{
                width: '100%',
                height: width,
                bgcolor: 'action.disabledBackground',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="caption" color="text.disabled">
                Album Cover
              </Typography>
            </Box>
            <CardContent sx={{ p: 1 }}>
              <Typography variant="caption">
                Album Title
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Stack>
    </Box>
  );
};

export default AlbumCardSettings;
