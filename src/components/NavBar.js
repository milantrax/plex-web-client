// src/components/NavBar.js
import React from 'react';
import { NavLink } from 'react-router-dom';
import SearchBar from './SearchBar';

function NavBar({ onPlayTrack }) {
  const navLinkClasses = ({ isActive }) =>
    `btn btn-ghost no-underline whitespace-nowrap
     ${isActive ? 'btn-active' : ''}`;

  return (
    <nav className="navbar bg-base-300 sticky top-0 border-b-2 border-primary z-[1000] flex-col gap-4 py-4 md:flex-col md:gap-4 md:py-4">
      <div className="flex items-center gap-2 shrink-0 md:order-2 md:justify-center md:flex-wrap">
        <NavLink to="/" className={navLinkClasses} end>Library</NavLink>
        <NavLink to="/playlists" className={navLinkClasses}>Playlists</NavLink>
        <NavLink to="/genres" className={navLinkClasses}>Genres</NavLink>
        <NavLink to="/queue" className={navLinkClasses}>Queue</NavLink>
        <NavLink to="/settings" className={navLinkClasses}>Settings</NavLink>
      </div>

      <div className="flex-1 flex justify-center max-w-[500px] min-w-[200px] md:order-1 md:max-w-full lg:max-w-[300px]">
        <SearchBar onPlayTrack={onPlayTrack} />
      </div>

      <div className="shrink-0 md:order-3">
        <span className="text-primary font-bold text-lg tracking-wide">Plex</span>
      </div>
    </nav>
  );
}

export default NavBar;