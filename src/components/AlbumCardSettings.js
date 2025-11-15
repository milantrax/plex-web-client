// src/components/AlbumCardSettings.js
import React, { useState, useEffect } from 'react';
import { getAlbumCardWidth, setAlbumCardWidth, resetAlbumCardWidth } from '../utils/settingsStorage';

const AlbumCardSettings = () => {
  const [width, setWidth] = useState(getAlbumCardWidth());
  const [isChanged, setIsChanged] = useState(false);

  useEffect(() => {
    const defaultWidth = 180;
    setIsChanged(width !== defaultWidth);
  }, [width]);

  const handleWidthChange = (e) => {
    const newWidth = parseInt(e.target.value, 10);
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
    <div className="album-card-settings">
      <h3>Album Card Settings</h3>
      
      <div className="setting-group">
        <label htmlFor="album-width">Album Card Width:</label>
        <div className="width-control">
          <input
            type="range"
            id="album-width"
            min="120"
            max="300"
            value={width}
            onChange={handleWidthChange}
            className="width-slider"
          />
          <span className="width-value">{width}px</span>
        </div>
        
        {isChanged && (
          <button 
            onClick={handleReset}
            className="reset-button"
          >
            Reset to Default (180px)
          </button>
        )}
      </div>
      
      <div className="setting-preview">
        <p>Preview:</p>
        <div 
          className="preview-card"
          style={{
            width: `${width}px`,
            height: `${width + 60}px`, // Add space for text
            backgroundColor: '#444',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <div 
            style={{
              width: '100%',
              height: `${width}px`,
              backgroundColor: '#666',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ccc',
              fontSize: '12px'
            }}
          >
            Album Cover
          </div>
          <div style={{ padding: '8px', fontSize: '12px', color: '#fff' }}>
            Album Title
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlbumCardSettings;
