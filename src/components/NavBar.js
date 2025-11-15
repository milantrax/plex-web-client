// src/components/NavBar.js
import React from 'react';
import { NavLink } from 'react-router-dom';
import SearchBar from './SearchBar';
import '../styles/NavBar.scss';

function NavBar({ onPlayTrack }) {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''} end>Library</NavLink>
        <NavLink to="/playlists" className={({ isActive }) => isActive ? 'active' : ''}>Playlists</NavLink>
        <NavLink to="/genres" className={({ isActive }) => isActive ? 'active' : ''}>Genres</NavLink>
        <NavLink to="/queue" className={({ isActive }) => isActive ? 'active' : ''}>Queue</NavLink>
        <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''}>Settings</NavLink>
      </div>
      
      <div className="navbar-center">
        <SearchBar onPlayTrack={onPlayTrack} />
      </div>
      
      <div className="navbar-right">
        <span className="navbar-logo">Plex</span>
      </div>
    </nav>
  );
}

export default NavBar;