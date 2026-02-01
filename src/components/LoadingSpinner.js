// src/components/LoadingSpinner.js
import React from 'react';

function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center my-10">
      <span className="loading loading-spinner loading-lg text-primary"></span>
    </div>
  );
}

export default LoadingSpinner;