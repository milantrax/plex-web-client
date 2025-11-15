import React, { useState } from 'react';
import CacheManager from '../components/CacheManager';
import AlbumCardSettings from '../components/AlbumCardSettings';
import '../styles/Settings.scss';

const Settings = () => {
  const [activeSection, setActiveSection] = useState('display');

  const settingSections = [
    { id: 'display', title: 'Display Settings' },
    { id: 'cache', title: 'Cache Management' }
  ];

  const renderSettingsContent = () => {
    switch (activeSection) {
      case 'display':
        return (
          <div className="settings-section">
            <h3>Display Settings</h3>
            <AlbumCardSettings />
          </div>
        );
      case 'cache':
        return (
          <div className="settings-section">
            <h3>Cache Management</h3>
            <CacheManager />
          </div>
        );
      default:
        return (
          <div className="settings-section">
            <h3>Display Settings</h3>
            <AlbumCardSettings />
          </div>
        );
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-container">
        <div className="settings-sidebar">
          <div className="settings-list">
            {settingSections.map(section => (
              <div 
                key={section.id} 
                className={`setting-item ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                <span className="setting-title">{section.title}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="settings-content">
          {renderSettingsContent()}
        </div>
      </div>
    </div>
  );
};

export default Settings;
