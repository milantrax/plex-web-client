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
            <h3 className="text-2xl font-bold text-base-content mb-5">Display Settings</h3>
            <AlbumCardSettings />
          </div>
        );
      case 'cache':
        return (
          <div>
            <h3 className="text-2xl font-bold text-base-content mb-5">Cache Management</h3>
            <CacheManager />
          </div>
        );
      default:
        return (
          <div>
            <h3 className="text-2xl font-bold text-base-content mb-5">Display Settings</h3>
            <AlbumCardSettings />
          </div>
        );
    }
  };

  return (
    <div className="px-5 py-5">
      <div className="flex gap-5">
        <div className="w-[250px] card bg-base-200 shadow-xl h-fit sticky top-5">
          <ul className="menu p-0 custom-scrollbar max-h-[calc(100vh-120px)] overflow-y-auto">
            {settingSections.map(section => (
              <li key={section.id}>
                {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                <a
                  href="#"
                  className={`${activeSection === section.id ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); setActiveSection(section.id); }}
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-1">
          {renderSettingsContent()}
        </div>
      </div>
    </div>
  );
};

export default Settings;
