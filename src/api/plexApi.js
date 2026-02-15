import axios from 'axios';
import { PLEX_URL, PLEX_TOKEN } from '../config';

// TODO: implement Node server for proxying requests and handling caching to avoid CORS issues and improve performance. For now, we will use client-side caching with localStorage, but this is not ideal for larger libraries or multi-user environments.
// Cache configuration
const CACHE_CONFIG = {
  defaultExpirationMinutes: 60,
  keys: {
    sections: 'plex_sections',
    albums: 'plex_albums_',
    tracks: 'plex_tracks_',
    playlists: 'plex_playlists',
    genres: 'plex_genres_',
    albumsByGenre: 'plex_albums_by_genre_',
    years: 'plex_years_',
    albumsByYear: 'plex_albums_by_year_',
    labels: 'plex_labels_',
    albumsByLabel: 'plex_albums_by_label_',
    search: 'plex_search_'
  }
};

// Cache helper functions
const cacheHelpers = {
  /**
   * Get item from localStorage cache
   * @param {string} key - Cache key
   * @return {Object|null} Cached data or null if not found or expired
   */
  getFromCache(key) {
    try {
      const cachedItem = localStorage.getItem(key);
      if (!cachedItem) return null;
      
      const { data, expiry } = JSON.parse(cachedItem);
      
      if (expiry && new Date().getTime() > expiry) {
        localStorage.removeItem(key); // Remove expired cache
        return null;
      }
      
      return data;
    } catch (error) {
      console.warn('Error reading from cache:', error);
      return null;
    }
  },
  
  /**
   * Save item to localStorage cache
   * @param {string} key - Cache key
   * @param {Object} data - Data to cache
   * @param {number} expirationMinutes - Cache expiration in minutes
   */
  saveToCache(key, data, expirationMinutes = CACHE_CONFIG.defaultExpirationMinutes) {
    try {
      const expiry = new Date().getTime() + (expirationMinutes * 60 * 1000);
      const cacheItem = JSON.stringify({
        data,
        expiry
      });
      
      localStorage.setItem(key, cacheItem);
    } catch (error) {
      console.warn('Error saving to cache:', error);
    }
  },
  
  /**
   * Clear all Plex related cache items
   */
  clearAllCache() {
    try {
      Object.values(CACHE_CONFIG.keys).forEach(keyPrefix => {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(keyPrefix)) {
            localStorage.removeItem(key);
          }
        }
      });
      console.log('All Plex cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  },
  
  /**
   * Clear specific cache by type
   * @param {string} type - Cache type (e.g., 'sections', 'albums')
   * @param {string} [id] - Optional ID for specific item cache
   */
  clearCache(type, id = '') {
    try {
      const keyPrefix = CACHE_CONFIG.keys[type];
      if (!keyPrefix) return;
      
      const key = `${keyPrefix}${id}`;
      
      if (id) {
        localStorage.removeItem(key);
      } else {
        for (let i = 0; i < localStorage.length; i++) {
          const storageKey = localStorage.key(i);
          if (storageKey && storageKey.startsWith(keyPrefix)) {
            localStorage.removeItem(storageKey);
          }
        }
      }
    } catch (error) {
      console.error(`Error clearing ${type} cache:`, error);
    }
  }
};

// Export cache helpers for use in other components
export const plexCache = cacheHelpers;

export const plexApi = axios.create({
  baseURL: PLEX_URL,
  headers: {
    'Accept': 'application/json',
    'X-Plex-Token': PLEX_TOKEN,
  },
});

// --- Helper Functions ---
export const getPlexImageUrl = (thumbPath) => {
  if (!thumbPath) return null; // Handle cases where thumb might be missing
  const url = new URL(PLEX_URL + thumbPath);
  url.searchParams.append('X-Plex-Token', PLEX_TOKEN);
  return url.toString();
};

export const getPlexAudioUrl = (partKey) => {
  if (!partKey) return null;
  
  const url = new URL(`${PLEX_URL}${partKey}`);
  url.searchParams.append('X-Plex-Token', PLEX_TOKEN);
  
  return url.toString();
};

export const getPlexTranscodeUrl = (partKey) => {
  if (!partKey) return null;
  
  const url = new URL(`${PLEX_URL}/audio/:/transcode/universal/start.mp3`);
  url.searchParams.append('path', partKey);
  url.searchParams.append('mediaIndex', '0');
  url.searchParams.append('partIndex', '0');
  url.searchParams.append('protocol', 'http');
  url.searchParams.append('audioCodec', 'mp3');
  url.searchParams.append('audioBitrate', '320');
  url.searchParams.append('X-Plex-Token', PLEX_TOKEN);
  
  return url.toString();
}

// --- API Calls ---
/**
 * Get all library sections
 * @param {boolean} [useCache=true] - Whether to use cache if available
 * @returns {Promise<Array>} Plex sections
 */
export const getSections = async (useCache = true) => {
  const cacheKey = CACHE_CONFIG.keys.sections;
  
  try {
    if (useCache) {
      const cachedData = cacheHelpers.getFromCache(cacheKey);
      if (cachedData) {
        console.log('Using cached sections data');
        return cachedData;
      }
    }
    
    const response = await plexApi.get('/library/sections');
    const sections = response.data.MediaContainer.Directory || [];
    
    cacheHelpers.saveToCache(cacheKey, sections);
    
    return sections;
  } catch (error) {
    console.error("Error fetching sections:", error);
    throw error;
  }
};

/**
 * Get items from a specific section (e.g., albums from a music section)
 * @param {string} sectionId - The section ID
 * @param {number} [type=9] - Content type (9 = Albums)
 * @param {boolean} [useCache=true] - Whether to use cache if available
 * @returns {Promise<Array>} Section items
 */
export const getSectionItems = async (sectionId, type = 9, start = 0, size = null, useCache = true) => {
  const cacheKey = `${CACHE_CONFIG.keys.albums}${sectionId}_${type}_${start}_${size}`;
  
  try {
    if (useCache && start === 0 && !size) {
      const cachedData = cacheHelpers.getFromCache(cacheKey);
      if (cachedData) {
        console.log(`Using cached section items for section ${sectionId}`);
        return cachedData;
      }
    }
    
    let url = `/library/sections/${sectionId}/all?type=${type}`;
    if (start > 0) {
      url += `&X-Plex-Container-Start=${start}`;
    }
    if (size) {
      url += `&X-Plex-Container-Size=${size}`;
    }
    
    const response = await plexApi.get(url);
    const items = response.data.MediaContainer.Metadata || [];
    
    if (start === 0 && !size) {
      cacheHelpers.saveToCache(cacheKey, items, 120);
    }
    
    return items;
  } catch (error) {
    console.error(`Error fetching items for section ${sectionId}:`, error);
    throw error;
  }
};

/**
 * Get tracks for a specific album
 * @param {string} albumRatingKey - Album rating key
 * @param {boolean} [useCache=true] - Whether to use cache if available
 * @returns {Promise<Array>} Album tracks
 */
export const getAlbumTracks = async (albumRatingKey, useCache = true) => {
  const cacheKey = `${CACHE_CONFIG.keys.tracks}${albumRatingKey}`;
  
  try {
    if (useCache) {
      const cachedData = cacheHelpers.getFromCache(cacheKey);
      if (cachedData) {
        console.log(`Using cached tracks for album ${albumRatingKey}`);
        return cachedData;
      }
    }
    
    const response = await plexApi.get(`/library/metadata/${albumRatingKey}/children`);
    const tracks = response.data.MediaContainer.Metadata || [];
    
    cacheHelpers.saveToCache(cacheKey, tracks, 240);
    
    return tracks;
  } catch (error) {
    console.error(`Error fetching tracks for album ${albumRatingKey}:`, error);
    throw error;
  }
};

/**
 * Get audio playlists
 * @param {boolean} [useCache=true] - Whether to use cache if available
 * @returns {Promise<Array>} Playlists
 */
export const getPlaylists = async (useCache = true) => {
  const cacheKey = CACHE_CONFIG.keys.playlists;
  
  try {
    if (useCache) {
      const cachedData = cacheHelpers.getFromCache(cacheKey);
      if (cachedData) {
        console.log('Using cached playlists data');
        return cachedData;
      }
    }
    
    const response = await plexApi.get('/playlists?playlistType=audio');
    const playlists = response.data.MediaContainer.Metadata || [];
    
    cacheHelpers.saveToCache(cacheKey, playlists, 30);
    
    return playlists;
  } catch (error) {
    console.error("Error fetching playlists:", error);
    throw error;
  }
};

/**
 * Get items from a specific playlist
 * @param {string} playlistRatingKey - Playlist rating key
 * @param {boolean} [useCache=true] - Whether to use cache if available
 * @returns {Promise<Array>} Playlist items
 */
export const getPlaylistItems = async (playlistRatingKey, useCache = true) => {
  const cacheKey = `plex_playlist_items_${playlistRatingKey}`;
  
  try {
    if (useCache) {
      const cachedData = cacheHelpers.getFromCache(cacheKey);
      if (cachedData) {
        console.log(`Using cached playlist items for playlist ${playlistRatingKey}`);
        return cachedData;
      }
    }
    
    const response = await plexApi.get(`/playlists/${playlistRatingKey}/items`);
    const items = response.data.MediaContainer.Metadata || [];
    
    cacheHelpers.saveToCache(cacheKey, items, 30);
    
    return items;
  } catch (error) {
    console.error(`Error fetching items for playlist ${playlistRatingKey}:`, error);
    throw error;
  }
};

/**
 * Get genres for a specific music section
 * @param {string} sectionId - Section ID
 * @param {number} [type=9] - Content type (9 = Album genres)
 * @param {boolean} [useCache=true] - Whether to use cache if available
 * @returns {Promise<Array>} Genres
 */
export const getGenres = async (sectionId, type = 9, useCache = true) => {
  const cacheKey = `${CACHE_CONFIG.keys.genres}${sectionId}_${type}`;
  
  try {
    if (useCache) {
      const cachedData = cacheHelpers.getFromCache(cacheKey);
      if (cachedData) {
        console.log(`Using cached genres for section ${sectionId}`);
        return cachedData;
      }
    }
    
    let genres = [];
    try {
      const response = await plexApi.get(`/library/sections/${sectionId}/genre?type=${type}`);
      genres = response.data.MediaContainer.Directory || [];
      console.log(`Found ${genres.length} genres from /genre endpoint`);
    } catch (error) {
      console.log('Standard genre endpoint failed, trying alternatives:', error.message);
      
      try {
        const albumsResponse = await plexApi.get(`/library/sections/${sectionId}/all?type=${type}`);
        const albums = albumsResponse.data.MediaContainer.Metadata || [];
        console.log(`Got ${albums.length} albums to extract genres from`);
        
        const genreMap = new Map();
        albums.forEach(album => {
          console.log('Album sample:', {
            title: album.title,
            genre: album.genre,
            Genre: album.Genre,
            genres: album.genres,
            allFields: Object.keys(album)
          });
          
          let genreArray = album.Genre || album.genre || album.genres;
          
          if (genreArray) {
            if (Array.isArray(genreArray)) {
              genreArray.forEach(genre => {
                const genreName = typeof genre === 'object' ? (genre.tag || genre.title || genre.name) : genre;
                if (genreName) {
                  if (genreMap.has(genreName)) {
                    genreMap.set(genreName, genreMap.get(genreName) + 1);
                  } else {
                    genreMap.set(genreName, 1);
                  }
                }
              });
            } else if (typeof genreArray === 'string') {
              if (genreMap.has(genreArray)) {
                genreMap.set(genreArray, genreMap.get(genreArray) + 1);
              } else {
                genreMap.set(genreArray, 1);
              }
            }
          }
        });
        
        console.log('Genre map after processing:', genreMap);
        
        genres = Array.from(genreMap.entries()).map(([tag, count], index) => ({
          id: tag,
          tag: tag,
          title: tag,
          count: count
        }));
        
        console.log(`Extracted ${genres.length} unique genres from albums`);
      } catch (fallbackError) {
        console.error('Genre extraction from albums also failed:', fallbackError);
        throw fallbackError;
      }
    }
    
    cacheHelpers.saveToCache(cacheKey, genres, 240);
    
    return genres;
  } catch (error) {
    console.error(`Error fetching genres for section ${sectionId}:`, error);
    throw error;
  }
};

/**
 * Get albums by genre
 * @param {string} sectionId - Section ID
 * @param {string} genreId - Genre ID or genre name
 * @param {number} [type=9] - Content type (9 = Albums)
 * @param {boolean} [useCache=true] - Whether to use cache if available
 * @returns {Promise<Array>} Albums in the genre
 */
export const getAlbumsByGenre = async (sectionId, genreId, type = 9, useCache = true) => {
  const cacheKey = `${CACHE_CONFIG.keys.albumsByGenre}${sectionId}_${genreId}_${type}`;
  
  try {
    if (useCache) {
      const cachedData = cacheHelpers.getFromCache(cacheKey);
      if (cachedData) {
        console.log(`Using cached albums for genre ${genreId} in section ${sectionId}`);
        return cachedData;
      }
    }
    
    let albums = [];
    try {
      const response = await plexApi.get(`/library/sections/${sectionId}/all?type=${type}&genre=${genreId}`);
      albums = response.data.MediaContainer.Metadata || [];
      console.log(`Found ${albums.length} albums from genre filter endpoint`);
    } catch (error) {
      console.log('Standard genre filter failed, trying manual filtering:', error.message);
      
      try {
        const albumsResponse = await plexApi.get(`/library/sections/${sectionId}/all?type=${type}`);
        const allAlbums = albumsResponse.data.MediaContainer.Metadata || [];
        
        albums = allAlbums.filter(album => {
          if (!album.Genre) return false;
          return album.Genre.some(genre => 
            genre.tag === genreId || 
            genre.id === genreId ||
            genreId.includes(genre.tag)
          );
        });
        
        console.log(`Manually filtered to ${albums.length} albums for genre ${genreId}`);
      } catch (fallbackError) {
        console.error('Manual genre filtering also failed:', fallbackError);
        throw fallbackError;
      }
    }
    
    cacheHelpers.saveToCache(cacheKey, albums, 120);
    
    return albums;
  } catch (error) {
    console.error(`Error fetching albums for genre ${genreId} in section ${sectionId}:`, error);
    throw error;
  }
};

/**
 * Get years for a specific music section
 * @param {string} sectionId - Section ID
 * @param {number} [type=9] - Content type (9 = Album years)
 * @param {boolean} [useCache=true] - Whether to use cache if available
 * @returns {Promise<Array>} Years
 */
export const getYears = async (sectionId, type = 9, useCache = true) => {
  const cacheKey = `${CACHE_CONFIG.keys.years}${sectionId}_${type}`;
  
  try {
    if (useCache) {
      const cachedData = cacheHelpers.getFromCache(cacheKey);
      if (cachedData) {
        console.log(`Using cached years for section ${sectionId}`);
        return cachedData;
      }
    }
    
    let years = [];
    try {
      const response = await plexApi.get(`/library/sections/${sectionId}/year?type=${type}`);
      years = response.data.MediaContainer.Directory || [];
      console.log(`Found ${years.length} years from /year endpoint`);
    } catch (error) {
      console.log('Standard year endpoint failed, trying alternatives:', error.message);
      
      try {
        const albumsResponse = await plexApi.get(`/library/sections/${sectionId}/all?type=${type}`);
        const albums = albumsResponse.data.MediaContainer.Metadata || [];
        console.log(`Got ${albums.length} albums to extract years from`);
        
        const yearMap = new Map();
        albums.forEach(album => {
          console.log('Album year sample:', {
            title: album.title,
            year: album.year,
            originallyAvailableAt: album.originallyAvailableAt,
            parentYear: album.parentYear,
            allFields: Object.keys(album)
          });
          
          let year = album.year || album.parentYear;
          
          if (!year && album.originallyAvailableAt) {
            year = album.originallyAvailableAt.substring(0, 4);
          }
          
          if (year) {
            year = parseInt(year);
            if (!isNaN(year) && year > 1900 && year <= new Date().getFullYear()) {
              if (yearMap.has(year)) {
                yearMap.set(year, yearMap.get(year) + 1);
              } else {
                yearMap.set(year, 1);
              }
            }
          }
        });
        
        console.log('Year map after processing:', yearMap);
        
        years = Array.from(yearMap.entries()).map(([year, count]) => ({
          id: year.toString(), // Use the year as ID for easier filtering
          title: year.toString(),
          count: count
        }));
        
        console.log(`Extracted ${years.length} unique years from albums`);
      } catch (fallbackError) {
        console.error('Year extraction from albums also failed:', fallbackError);
        throw fallbackError;
      }
    }
    
    cacheHelpers.saveToCache(cacheKey, years, 240);
    
    return years;
  } catch (error) {
    console.error(`Error fetching years for section ${sectionId}:`, error);
    throw error;
  }
};

/**
 * Get albums by year
 * @param {string} sectionId - Section ID
 * @param {string} year - Year
 * @param {number} [type=9] - Content type (9 = Albums)
 * @param {boolean} [useCache=true] - Whether to use cache if available
 * @returns {Promise<Array>} Albums in the year
 */
export const getAlbumsByYear = async (sectionId, year, type = 9, useCache = true) => {
  const cacheKey = `${CACHE_CONFIG.keys.albumsByYear}${sectionId}_${year}_${type}`;
  
  try {
    if (useCache) {
      const cachedData = cacheHelpers.getFromCache(cacheKey);
      if (cachedData) {
        console.log(`Using cached albums for year ${year} in section ${sectionId}`);
        return cachedData;
      }
    }
    
    let albums = [];
    try {
      const response = await plexApi.get(`/library/sections/${sectionId}/all?type=${type}&year=${year}`);
      albums = response.data.MediaContainer.Metadata || [];
      console.log(`Found ${albums.length} albums from year filter endpoint`);
    } catch (error) {
      console.log('Standard year filter failed, trying manual filtering:', error.message);
      
      try {
        const albumsResponse = await plexApi.get(`/library/sections/${sectionId}/all?type=${type}`);
        const allAlbums = albumsResponse.data.MediaContainer.Metadata || [];
        
        albums = allAlbums.filter(album => {
          const albumYear = album.year || album.originallyAvailableAt?.substring(0, 4);
          return albumYear === year || albumYear === parseInt(year);
        });
        
        console.log(`Manually filtered to ${albums.length} albums for year ${year}`);
      } catch (fallbackError) {
        console.error('Manual year filtering also failed:', fallbackError);
        throw fallbackError;
      }
    }
    
    cacheHelpers.saveToCache(cacheKey, albums, 120);
    
    return albums;
  } catch (error) {
    console.error(`Error fetching albums for year ${year} in section ${sectionId}:`, error);
    throw error;
  }
};

/**
 * Search for albums and tracks across all music sections
 * @param {string} query - Search query string
 * @param {Object} options - Search options
 * @param {boolean} options.useCache - Whether to use cache (default: true)
 * @param {number} options.limit - Maximum number of results (default: 50)
 * @return {Promise<Object>} Object containing albums and tracks arrays
 */
export const searchMusic = async (query, options = {}) => {
  const { useCache = true, limit = 50 } = options;
  
  if (!query || query.trim().length < 2) {
    return { albums: [], tracks: [] };
  }
  
  try {
    const cacheKey = `${CACHE_CONFIG.keys.search || 'plex_search_'}${encodeURIComponent(query.toLowerCase())}`;
    
    if (useCache) {
      const cachedData = cacheHelpers.getFromCache(cacheKey);
      if (cachedData) {
        console.log(`Using cached search results for: ${query}`);
        return cachedData;
      }
    }
    
    const sections = await getSections();
    const musicSections = sections.filter(section => section.type === 'artist');
    
    const searchResults = { albums: [], tracks: [] };
    
    for (const section of musicSections) {
      try {
        const albumResponse = await plexApi.get(`/library/sections/${section.key}/search?type=9&query=${encodeURIComponent(query)}`);
        const albums = albumResponse.data.MediaContainer.Metadata || [];
        searchResults.albums.push(...albums);
        
        const trackResponse = await plexApi.get(`/library/sections/${section.key}/search?type=10&query=${encodeURIComponent(query)}`);
        const tracks = trackResponse.data.MediaContainer.Metadata || [];
        searchResults.tracks.push(...tracks);
      } catch (sectionError) {
        console.warn(`Error searching in section ${section.title}:`, sectionError);
      }
    }
    
    searchResults.albums = searchResults.albums
      .filter((album, index, self) => index === self.findIndex(a => a.ratingKey === album.ratingKey))
      .slice(0, limit);
    
    searchResults.tracks = searchResults.tracks
      .filter((track, index, self) => index === self.findIndex(t => t.ratingKey === track.ratingKey))
      .slice(0, limit);
    
    cacheHelpers.saveToCache(cacheKey, searchResults, 30);
    
    return searchResults;
  } catch (error) {
    console.error("Error searching music:", error);
    throw error;
  }
};

/**
 * Search for albums that contain tracks matching the query
 * @param {string} query - Search query string
 * @param {Object} options - Search options
 * @param {boolean} options.useCache - Whether to use cache (default: true)
 * @return {Promise<Array>} Array of albums containing matching tracks
 */
export const searchAlbumsWithMatchingTracks = async (query, options = {}) => {
  const { useCache = true } = options;
  
  if (!query || query.trim().length < 2) {
    return [];
  }
  
  try {
    const searchResults = await searchMusic(query, { useCache });
    
    const matchingAlbums = new Map();
    
    searchResults.albums.forEach(album => {
      matchingAlbums.set(album.ratingKey, {
        ...album,
        matchType: 'album'
      });
    });
    
    for (const track of searchResults.tracks) {
      if (track.parentRatingKey && !matchingAlbums.has(track.parentRatingKey)) {
        try {
          const albumResponse = await plexApi.get(`/library/metadata/${track.parentRatingKey}`);
          const album = albumResponse.data.MediaContainer.Metadata[0];
          
          if (album) {
            matchingAlbums.set(album.ratingKey, {
              ...album,
              matchType: 'track',
              matchingTrack: track.title
            });
          }
        } catch (albumError) {
          console.warn(`Error fetching album for track ${track.title}:`, albumError);
        }
      }
    }
    
    return Array.from(matchingAlbums.values());
  } catch (error) {
    console.error("Error searching albums with matching tracks:", error);
    throw error;
  }
};

/**
 * Get the download URL for a track
 * @param {string} partKey - The part key from the track's Media.Part
 * @param {string} trackTitle - The title of the track for filename
 * @return {string} Direct download URL
 */
export const getTrackDownloadUrl = (partKey, trackTitle = 'track') => {
  if (!partKey) return null;
  
  const url = new URL(`${PLEX_URL}${partKey}`);
  url.searchParams.append('X-Plex-Token', PLEX_TOKEN);
  url.searchParams.append('download', '1');
  
  return url.toString();
};

/**
 * Download a track file
 * @param {Object} track - The track object containing Media and Part information
 * @param {string} albumTitle - The album title for filename
 * @return {Promise<void>}
 */
export const downloadTrack = async (track, albumTitle = '') => {
  try {
    if (!track.Media || !track.Media[0] || !track.Media[0].Part || !track.Media[0].Part[0]) {
      throw new Error('Track does not have valid media information');
    }
    
    const partKey = track.Media[0].Part[0].key;
    const downloadUrl = getTrackDownloadUrl(partKey, track.title);
    
    if (!downloadUrl) {
      throw new Error('Unable to generate download URL');
    }
    
    const artist = track.grandparentTitle || 'Unknown Artist';
    const album = albumTitle || track.parentTitle || 'Unknown Album';
    const trackNumber = track.index ? String(track.index).padStart(2, '0') : '00';
    const title = track.title || 'Unknown Track';
    
    const cleanString = (str) => str.replace(/[<>:"/\\|?*]/g, '_');
    const filename = `${cleanString(artist)} - ${cleanString(album)} - ${trackNumber} - ${cleanString(title)}.mp3`;
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`Downloaded: ${filename}`);
  } catch (error) {
    console.error('Error downloading track:', error);
    throw error;
  }
};

/**
 * Get labels for a specific music section
 * @param {string} sectionId - Section ID
 * @param {number} [type=9] - Content type (9 = Album labels)
 * @param {boolean} [useCache=true] - Whether to use cache if available
 * @returns {Promise<Array>} Labels
 */
export const getLabels = async (sectionId, type = 9, useCache = true) => {
  const cacheKey = `${CACHE_CONFIG.keys.labels}${sectionId}_${type}`;
  
  try {
    if (useCache) {
      const cachedData = cacheHelpers.getFromCache(cacheKey);
      if (cachedData) {
        console.log(`Using cached labels for section ${sectionId}`);
        return cachedData;
      }
    }
    
    let labels = [];
    try {
      const response = await plexApi.get(`/library/sections/${sectionId}/studio?type=${type}`);
      labels = response.data.MediaContainer.Directory || [];
      console.log(`Found ${labels.length} labels from /studio endpoint`);
    } catch (error) {
      console.log('Standard studio endpoint failed, trying alternatives:', error.message);
      
      try {
        const albumsResponse = await plexApi.get(`/library/sections/${sectionId}/all?type=${type}`);
        const albums = albumsResponse.data.MediaContainer.Metadata || [];
        console.log(`Got ${albums.length} albums to extract labels from`);
        
        const labelMap = new Map();
        albums.forEach(album => {
          console.log('Album label sample:', {
            title: album.title,
            studio: album.studio,
            label: album.label,
            publisher: album.publisher,
            recordLabel: album.recordLabel,
            allFields: Object.keys(album)
          });
          
          const labelValue = album.studio || album.label || album.publisher || album.recordLabel;
          
          if (labelValue) {
            if (labelMap.has(labelValue)) {
              labelMap.set(labelValue, labelMap.get(labelValue) + 1);
            } else {
              labelMap.set(labelValue, 1);
            }
          }
        });
        
        console.log('Label map after processing:', labelMap);
        
        labels = Array.from(labelMap.entries()).map(([label, count]) => ({
          id: label,
          tag: label,
          title: label,
          count: count
        }));
        
        console.log(`Extracted ${labels.length} unique labels from albums`);
      } catch (fallbackError) {
        console.error('Label extraction from albums also failed:', fallbackError);
        throw fallbackError;
      }
    }
    
    cacheHelpers.saveToCache(cacheKey, labels, 240);
    
    return labels;
  } catch (error) {
    console.error(`Error fetching labels for section ${sectionId}:`, error);
    throw error;
  }
};

/**
 * Get albums by label
 * @param {string} sectionId - Section ID
 * @param {string} label - Label name
 * @param {number} [type=9] - Content type (9 = Albums)
 * @param {boolean} [useCache=true] - Whether to use cache if available
 * @returns {Promise<Array>} Albums with the label
 */
export const getAlbumsByLabel = async (sectionId, label, type = 9, useCache = true) => {
  const cacheKey = `${CACHE_CONFIG.keys.albumsByLabel}${sectionId}_${label}_${type}`;
  
  try {
    if (useCache) {
      const cachedData = cacheHelpers.getFromCache(cacheKey);
      if (cachedData) {
        console.log(`Using cached albums for label ${label} in section ${sectionId}`);
        return cachedData;
      }
    }
    
    let albums = [];
    try {
      const response = await plexApi.get(`/library/sections/${sectionId}/all?type=${type}&studio=${label}`);
      albums = response.data.MediaContainer.Metadata || [];
      console.log(`Found ${albums.length} albums from studio filter endpoint`);
    } catch (error) {
      console.log('Standard studio filter failed, trying manual filtering:', error.message);
      
      try {
        const albumsResponse = await plexApi.get(`/library/sections/${sectionId}/all?type=${type}`);
        const allAlbums = albumsResponse.data.MediaContainer.Metadata || [];
        
        albums = allAlbums.filter(album => {
          const albumLabel = album.studio || album.label || album.publisher || album.recordLabel;
          return albumLabel === label;
        });
        
        console.log(`Manually filtered to ${albums.length} albums for label ${label}`);
      } catch (fallbackError) {
        console.error('Manual label filtering also failed:', fallbackError);
        throw fallbackError;
      }
    }
    
    cacheHelpers.saveToCache(cacheKey, albums, 120);
    
    return albums;
  } catch (error) {
    console.error(`Error fetching albums for label ${label} in section ${sectionId}:`, error);
    throw error;
  }
};