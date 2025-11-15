// src/config.js
// Configuration using environment variables for better security
export const PLEX_URL = process.env.REACT_APP_PLEX_URL;
export const PLEX_TOKEN = process.env.REACT_APP_PLEX_TOKEN;

if (!PLEX_URL || !PLEX_TOKEN || PLEX_URL.trim() === '' || PLEX_TOKEN.trim() === '') {
  console.warn("Plex configuration is missing! Please check your .env file.");
  alert("Please create a .env file in the project root with REACT_APP_PLEX_URL and REACT_APP_PLEX_TOKEN values.");
}