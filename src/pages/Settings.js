import React, { useState } from 'react';
import CacheManager from '../components/CacheManager';
import AlbumCardSettings from '../components/AlbumCardSettings';

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
          <div>
            <h3 className="text-2xl font-bold text-plex-text-primary mb-5">Display Settings</h3>
            <AlbumCardSettings />
          </div>
        );
      case 'cache':
        return (
          <div>
            <h3 className="text-2xl font-bold text-plex-text-primary mb-5">Cache Management</h3>
            <CacheManager />
          </div>
        );
      default:
        return (
          <div>
            <h3 className="text-2xl font-bold text-plex-text-primary mb-5">Display Settings</h3>
            <AlbumCardSettings />
          </div>
        );
    }
  };

  return (
    <div className="px-5 py-5">
      <div className="flex gap-5">
        <div className="w-[250px] bg-plex-surface rounded-lg border border-plex-border h-fit sticky top-5">
          <div className="custom-scrollbar max-h-[calc(100vh-120px)] overflow-y-auto">
            {settingSections.map(section => (
              <div
                key={section.id}
                className={`px-4 py-3 cursor-pointer border-b border-plex-border transition-colors duration-200
                           ${activeSection === section.id
                             ? 'bg-plex-accent text-plex-button-text font-bold'
                             : 'hover:bg-plex-card-hover text-plex-text-primary'
                           }`}
                onClick={() => setActiveSection(section.id)}
              >
                <span>{section.title}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1">
          {renderSettingsContent()}
        </div>
      </div>
    </div>
  );
};

export default Settings;
