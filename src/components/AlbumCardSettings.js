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
    <div className="space-y-6">
      <h3 className="text-xl font-bold">Album Card Settings</h3>

      <div className="form-control w-full max-w-xs">
        <label className="label" htmlFor="album-width">
          <span className="label-text">Album Card Width:</span>
          <span className="label-text-alt">{width}px</span>
        </label>
        <input
          type="range"
          id="album-width"
          min="120"
          max="300"
          value={width}
          onChange={handleWidthChange}
          className="range range-primary"
        />
        <div className="w-full flex justify-between text-xs px-2 mt-2">
          <span>120px</span>
          <span>210px</span>
          <span>300px</span>
        </div>

        {isChanged && (
          <button
            onClick={handleReset}
            className="btn btn-ghost btn-sm mt-2"
          >
            Reset to Default (180px)
          </button>
        )}
      </div>

      <div className="space-y-2">
        <p className="font-medium">Preview:</p>
        <div
          className="card bg-base-200 shadow-xl"
          style={{
            width: `${width}px`,
          }}
        >
          <div
            className="bg-base-300 flex items-center justify-center text-base-content/60 text-xs"
            style={{
              width: '100%',
              height: `${width}px`,
            }}
          >
            Album Cover
          </div>
          <div className="card-body p-2">
            <p className="text-xs">Album Title</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlbumCardSettings;
