/**
 * OpenAPI description of the API, served by routes/docs.ts.
 *
 * Written by hand rather than generated from JSDoc comments: the spec stays in
 * one place where it can be read as a whole, instead of being scattered across
 * the route files as YAML inside comments.
 */

const schemas = {
  Error: {
    type: 'object',
    properties: { error: { type: 'string', example: 'Authentication required' } }
  },
  User: {
    type: 'object',
    description: 'The signed-in account. The Plex token is masked, never returned in full.',
    properties: {
      id: { type: 'integer', example: 2 },
      username: { type: 'string', description: 'Display name, not used to sign in', example: 'milantrax' },
      email: { type: 'string', format: 'email', example: 'you@example.com' },
      plexUrl: { type: 'string', nullable: true, example: 'http://192.168.1.100:32400' },
      plexToken: { type: 'string', nullable: true, description: 'Masked placeholder when set', example: '••••••••' },
      hasCustomPlex: { type: 'boolean', description: 'Whether this account overrides the default server' },
      createdAt: { type: 'string', format: 'date-time' }
    }
  },
  PlexMetadata: {
    type: 'object',
    description: 'A Plex item — artist, album or track. Passed through largely as Plex returns it.',
    properties: {
      ratingKey: { type: 'string', example: '137517' },
      title: { type: 'string', example: 'So What' },
      type: { type: 'string', example: 'track' },
      thumb: { type: 'string', example: '/library/metadata/42/thumb/1726853404' },
      parentTitle: { type: 'string', description: 'Album title on a track; artist name on an album' },
      grandparentTitle: { type: 'string', description: 'Album artist on a track' },
      parentRatingKey: { type: 'string' },
      year: { type: 'integer', example: 1959 },
      duration: { type: 'integer', description: 'Milliseconds', example: 545000 },
      index: { type: 'integer', description: 'Track number' }
    },
    additionalProperties: true
  },
  MetadataContainer: {
    type: 'object',
    properties: {
      Metadata: { type: 'array', items: { $ref: '#/components/schemas/PlexMetadata' } },
      size: { type: 'integer' },
      totalSize: { type: 'integer' }
    }
  },
  FilterEntry: {
    type: 'object',
    description: 'A genre, year or label the library can be filtered by.',
    properties: {
      id: { oneOf: [{ type: 'string' }, { type: 'integer' }] },
      key: { type: 'string', example: 'Jazz' },
      title: { type: 'string', example: 'Jazz' },
      tag: { type: 'string', description: 'The value to filter by. Genres and labels carry one; years do not.' }
    }
  },
  Favorite: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      type: { type: 'string', enum: ['track', 'album', 'artist', 'playlist'] },
      rating_key: { type: 'string' },
      title: { type: 'string', nullable: true },
      thumb: { type: 'string', nullable: true },
      subtitle: { type: 'string', nullable: true },
      year: { type: 'integer', nullable: true },
      duration: { type: 'integer', nullable: true },
      part_key: { type: 'string', nullable: true },
      parent_rating_key: { type: 'string', nullable: true },
      added_at: { type: 'string', format: 'date-time' }
    }
  },
  CustomPlaylist: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 7 },
      name: { type: 'string', example: 'Road trip' },
      genre: { type: 'string', nullable: true, example: 'Jazz' },
      track_count: { type: 'integer', example: 12 },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' }
    }
  },
  PlaylistTrack: {
    type: 'object',
    properties: {
      id: { type: 'integer', description: 'Playlist row id, used when reordering or removing' },
      rating_key: { type: 'string' },
      title: { type: 'string', nullable: true },
      artist: { type: 'string', nullable: true },
      album: { type: 'string', nullable: true },
      duration: { type: 'integer', nullable: true },
      thumb: { type: 'string', nullable: true },
      part_key: { type: 'string', nullable: true },
      parent_rating_key: { type: 'string', nullable: true },
      position: { type: 'integer' },
      added_at: { type: 'string', format: 'date-time' }
    }
  },
  SyncStatus: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['idle', 'syncing', 'done', 'error'] },
      syncedAlbums: { type: 'integer', example: 12918 },
      totalAlbums: { type: 'integer', example: 12918 },
      lastSyncedAt: { type: 'string', format: 'date-time', nullable: true },
      startedAt: { type: 'string', format: 'date-time', nullable: true },
      errorMessage: { type: 'string', nullable: true }
    }
  }
};

const responses = {
  Unauthorized: {
    description: 'No valid session cookie.',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
  },
  NotFound: {
    description: 'No such resource, or it belongs to another account.',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
  },
  BadGateway: {
    description: 'The Plex server could not be reached, or refused the request.',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
  }
};

const useCacheParam = {
  name: 'useCache',
  in: 'query',
  description: 'Pass false to bypass the Redis response cache and go straight to Plex.',
  schema: { type: 'boolean', default: true }
};

const sectionIdParam = {
  name: 'sectionId',
  in: 'path',
  required: true,
  description: 'Library section key, from /api/plex/sections.',
  schema: { type: 'string' },
  example: '2'
};

const ratingKeyParam = {
  name: 'ratingKey',
  in: 'path',
  required: true,
  schema: { type: 'string' },
  example: '137517'
};

const unauthorized = { $ref: '#/components/responses/Unauthorized' };
const notFound = { $ref: '#/components/responses/NotFound' };
const badGateway = { $ref: '#/components/responses/BadGateway' };
const successFlag = {
  content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } }
};
const errorBody = { content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };

/** A GET that proxies Plex and answers with a MediaContainer. */
function plexList(summary: string, parameters: unknown[] = []) {
  return {
    tags: ['Library'],
    summary,
    parameters: [...parameters, useCacheParam],
    responses: {
      200: {
        description: 'Matching items.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/MetadataContainer' } } }
      },
      401: unauthorized,
      502: badGateway
    }
  };
}

/** A GET that streams bytes proxied from Plex. */
function mediaStream(summary: string, description: string) {
  return {
    tags: ['Media'],
    summary,
    description,
    parameters: [
      {
        name: 'path',
        in: 'query',
        required: true,
        description: 'The Plex path to proxy, as found on the item metadata.',
        schema: { type: 'string' }
      }
    ],
    responses: {
      200: {
        description: 'The requested bytes.',
        content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } }
      },
      206: { description: 'Partial content, when a Range header was sent.' },
      400: { description: 'The path parameter was missing.' },
      401: unauthorized
    }
  };
}

const playlistIdParam = { name: 'id', in: 'path', required: true, schema: { type: 'integer' } };

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Plex Web Client API',
    version: '1.0.0',
    description: [
      'The API behind the Plex web client. It proxies a Plex Media Server so the',
      'browser never sees the Plex token, and stores accounts, favorites and',
      'custom playlists of its own.',
      '',
      '### Authenticating',
      'Sign in with `POST /api/auth/login`. The session cookie it sets is sent',
      'automatically by the browser, so **Try it out** works on this page once you',
      'are signed in — there is no token to paste.',
      '',
      '### Caching',
      'Plex responses are cached per account in Redis. Add `useCache=false` to any',
      'read to bypass it. Album metadata is additionally mirrored into Postgres by',
      'the library sync, which the album endpoints prefer when it is present.'
    ].join('\n')
  },
  servers: [{ url: '/', description: 'This server' }],
  tags: [
    { name: 'Auth', description: 'Registration, sign-in and the account profile' },
    { name: 'Config', description: 'Deployment settings the client reads at startup' },
    { name: 'Library', description: 'Browsing the Plex music library' },
    { name: 'Search', description: 'Searching the library' },
    { name: 'Sync', description: 'Mirroring album metadata into Postgres' },
    { name: 'Media', description: 'Streaming images and audio through the proxy' },
    { name: 'Favorites', description: 'Per-account favorites' },
    { name: 'Playlists', description: "Playlists stored by this app, separate from Plex's own" },
    { name: 'System', description: 'Health and diagnostics' }
  ],
  components: {
    schemas,
    responses,
    securitySchemes: {
      sessionCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'connect.sid',
        description: 'Set by POST /api/auth/login and sent automatically by the browser.'
      }
    }
  },
  security: [{ sessionCookie: [] }],
  paths: {
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'Liveness check',
        description: 'Used by the container healthcheck. Needs no session.',
        security: [],
        responses: {
          200: {
            description: 'The server is up.',
            content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } } } }
          }
        }
      }
    },
    '/api/config': {
      get: {
        tags: ['Config'],
        summary: 'Client settings needed before sign-in',
        description: 'Unauthenticated, because the login screen needs the theme before anyone has signed in. Exposes nothing account-specific.',
        security: [],
        responses: {
          200: {
            description: 'Deployment settings.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    defaultTheme: {
                      type: 'string',
                      enum: ['light', 'dark', 'system'],
                      description: "Starting theme for a browser that has not chosen one. 'system' follows the device."
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/config/plex': {
      get: {
        tags: ['Config'],
        summary: 'The fallback Plex server',
        description: "Shown as placeholder text in the settings form. Requires a session, because the URL points at the operator's own network. The token is never returned — only whether one is configured.",
        responses: {
          200: {
            description: 'The configured fallback.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    defaultPlexUrl: { type: 'string', nullable: true, example: 'http://192.168.1.100:32400' },
                    hasDefaultToken: { type: 'boolean' }
                  }
                }
              }
            }
          },
          401: unauthorized
        }
      }
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Create an account',
        description: 'Signs the new account in and returns it. Email is required — it is what you sign in with.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'email', 'password'],
                properties: {
                  username: { type: 'string', minLength: 3, description: 'Display name', example: 'milantrax' },
                  email: { type: 'string', format: 'email', example: 'you@example.com' },
                  password: { type: 'string', minLength: 6, format: 'password' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Account created and signed in.', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          400: { description: 'A field is missing, the email is malformed, or the password is too short.', ...errorBody },
          409: { description: 'That username or email is already taken.', ...errorBody }
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Sign in',
        description: 'Sets the session cookie. Email matching ignores case and surrounding whitespace.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'you@example.com' },
                  password: { type: 'string', format: 'password' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Signed in.', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          400: { description: 'Email or password missing.', ...errorBody },
          401: { description: 'Wrong email or password. The message is the same either way, so it cannot be used to discover which addresses have an account.', ...errorBody }
        }
      }
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Sign out',
        description: 'Destroys the session and clears the cookie.',
        responses: { 200: { description: 'Signed out.', ...successFlag }, 401: unauthorized }
      }
    },
    '/api/auth/profile': {
      get: {
        tags: ['Auth'],
        summary: 'The signed-in account',
        responses: {
          200: { description: 'The account.', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          401: unauthorized,
          404: notFound
        }
      },
      put: {
        tags: ['Auth'],
        summary: "Set this account's Plex server",
        description: 'Send nulls to drop the override and fall back to the deployment default. Saving clears this account’s cached Plex responses.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  plexUrl: { type: 'string', nullable: true, example: 'http://192.168.1.100:32400' },
                  plexToken: { type: 'string', nullable: true }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'The updated account.', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          401: unauthorized
        }
      }
    },
    '/api/plex/test-connection': {
      get: {
        tags: ['Library'],
        summary: 'Check the Plex server responds',
        description: 'Always answers 200; read `success` to find out whether the connection worked.',
        responses: {
          200: {
            description: 'The outcome of the attempt.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    serverName: { type: 'string', example: 'Home Plex' },
                    version: { type: 'string' },
                    error: { type: 'string', description: 'Present when success is false' }
                  }
                }
              }
            }
          },
          401: unauthorized
        }
      }
    },
    '/api/plex/sections': {
      get: {
        tags: ['Library'],
        summary: 'List library sections',
        description: 'Music sections are the ones with type `artist`.',
        parameters: [useCacheParam],
        responses: {
          200: { description: 'The sections on the server.', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/PlexMetadata' } } } } },
          401: unauthorized,
          502: badGateway
        }
      }
    },
    '/api/plex/sections/{sectionId}/items': {
      get: plexList('List albums in a section', [
        sectionIdParam,
        { name: 'type', in: 'query', description: 'Plex item type. 9 is album.', schema: { type: 'integer', default: 9 } },
        { name: 'start', in: 'query', description: 'Offset for paging.', schema: { type: 'integer', default: 0 } },
        { name: 'size', in: 'query', description: 'Page size.', schema: { type: 'integer', default: 300 } }
      ])
    },
    '/api/plex/sections/{sectionId}/artists': {
      get: plexList('List artists in a section', [
        sectionIdParam,
        { name: 'start', in: 'query', schema: { type: 'integer', default: 0 } },
        { name: 'size', in: 'query', schema: { type: 'integer' } }
      ])
    },
    '/api/plex/sections/{sectionId}/genres': {
      get: {
        tags: ['Library'],
        summary: 'List genres in a section',
        parameters: [sectionIdParam, useCacheParam],
        responses: {
          200: { description: 'The genres present.', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/FilterEntry' } } } } },
          401: unauthorized,
          502: badGateway
        }
      }
    },
    '/api/plex/sections/{sectionId}/years': {
      get: {
        tags: ['Library'],
        summary: 'List years in a section',
        parameters: [sectionIdParam, useCacheParam],
        responses: {
          200: { description: 'The years present.', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/FilterEntry' } } } } },
          401: unauthorized
        }
      }
    },
    '/api/plex/sections/{sectionId}/labels': {
      get: {
        tags: ['Library'],
        summary: 'List record labels in a section',
        parameters: [sectionIdParam, useCacheParam],
        responses: {
          200: { description: 'The labels present.', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/FilterEntry' } } } } },
          401: unauthorized
        }
      }
    },
    '/api/plex/sections/{sectionId}/albums-by-genre': {
      get: plexList('Albums in a genre', [sectionIdParam, { name: 'genre', in: 'query', required: true, schema: { type: 'string' }, example: 'Jazz' }])
    },
    '/api/plex/sections/{sectionId}/albums-by-year': {
      get: plexList('Albums from a year', [sectionIdParam, { name: 'year', in: 'query', required: true, schema: { type: 'integer' }, example: 1959 }])
    },
    '/api/plex/sections/{sectionId}/albums-by-label': {
      get: plexList('Albums on a label', [sectionIdParam, { name: 'label', in: 'query', required: true, schema: { type: 'string' }, example: 'Columbia' }])
    },
    '/api/plex/albums/{ratingKey}/tracks': { get: plexList('Tracks on an album', [ratingKeyParam]) },
    '/api/plex/artists/{ratingKey}/albums': { get: plexList('Albums by an artist', [ratingKeyParam]) },
    '/api/plex/metadata/{ratingKey}': {
      get: {
        tags: ['Library'],
        summary: 'Fetch one item',
        parameters: [ratingKeyParam, useCacheParam],
        responses: {
          200: { description: 'The item, or null if there is no such key.', content: { 'application/json': { schema: { $ref: '#/components/schemas/PlexMetadata' } } } },
          401: unauthorized,
          502: badGateway
        }
      }
    },
    '/api/plex/playlists': {
      get: {
        tags: ['Library'],
        summary: "List Plex's own playlists",
        description: 'Audio playlists from the Plex server, distinct from the playlists this app stores.',
        parameters: [useCacheParam],
        responses: {
          200: { description: 'The playlists.', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/PlexMetadata' } } } } },
          401: unauthorized
        }
      }
    },
    '/api/plex/playlists/{ratingKey}/items': { get: plexList('Tracks on a Plex playlist', [ratingKeyParam]) },
    '/api/plex/playlists/{ratingKey}/export-m3u': {
      get: {
        tags: ['Library'],
        summary: 'Export a Plex playlist as M3U',
        description: 'The returned file embeds the Plex token in each URL, so treat it as a secret.',
        parameters: [ratingKeyParam],
        responses: {
          200: { description: 'An M3U playlist.', content: { 'audio/x-mpegurl': { schema: { type: 'string' } } } },
          401: unauthorized
        }
      }
    },
    '/api/plex/search': {
      get: {
        tags: ['Search'],
        summary: 'Search albums and tracks',
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' }, example: 'miles' },
          { name: 'limit', in: 'query', description: 'Caps each list separately.', schema: { type: 'integer', example: 10 } },
          useCacheParam
        ],
        responses: {
          200: {
            description: 'Matching albums and tracks.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    albums: { type: 'array', items: { $ref: '#/components/schemas/PlexMetadata' } },
                    tracks: { type: 'array', items: { $ref: '#/components/schemas/PlexMetadata' } }
                  }
                }
              }
            }
          },
          401: unauthorized
        }
      }
    },
    '/api/plex/search/albums': {
      get: {
        tags: ['Search'],
        summary: 'Search albums, including by their tracks',
        description: 'Returns albums whose title matches, plus albums containing a matching track. Each carries the tracks that matched in `matchingTracks`.',
        parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }, useCacheParam],
        responses: {
          200: {
            description: 'Matching albums.',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    allOf: [
                      { $ref: '#/components/schemas/PlexMetadata' },
                      { type: 'object', properties: { matchingTracks: { type: 'array', items: { $ref: '#/components/schemas/PlexMetadata' } } } }
                    ]
                  }
                }
              }
            }
          },
          401: unauthorized
        }
      }
    },
    '/api/plex/library/sync-status': {
      get: {
        tags: ['Sync'],
        summary: 'Progress of the library mirror',
        description: 'Album metadata is mirrored into Postgres so browsing does not depend on Plex being reachable.',
        responses: {
          200: { description: 'Current state.', content: { 'application/json': { schema: { $ref: '#/components/schemas/SyncStatus' } } } },
          401: unauthorized
        }
      }
    },
    '/api/plex/library/sync': {
      post: {
        tags: ['Sync'],
        summary: 'Start a full re-sync',
        description: 'Returns straight away; the sync runs in the background. Poll /api/plex/library/sync-status for progress.',
        responses: {
          202: { description: 'Sync started.', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
          401: unauthorized,
          409: { description: 'A sync is already running.', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } }
        }
      }
    },
    '/api/media/image': { get: mediaStream('Album art and artist images', 'Proxied so the Plex token stays on the server. Cached by the browser for a day.') },
    '/api/media/audio': { get: mediaStream('Stream a track', 'Supports Range requests, so seeking works.') },
    '/api/media/transcode': { get: mediaStream('Stream a track as MP3', 'Used as a fallback when direct playback fails.') },
    '/api/media/download': {
      get: {
        ...mediaStream('Download a track', 'Sent as an attachment.'),
        parameters: [
          { name: 'path', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'filename', in: 'query', description: 'Filename offered to the browser.', schema: { type: 'string', default: 'track.mp3' } }
        ]
      }
    },
    '/api/favorites': {
      get: {
        tags: ['Favorites'],
        summary: "List this account's favorites",
        parameters: [{ name: 'type', in: 'query', description: 'Return only one kind.', schema: { type: 'string', enum: ['track', 'album', 'artist', 'playlist'] } }],
        responses: {
          200: { description: 'Favorites, newest first.', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Favorite' } } } } },
          401: unauthorized
        }
      },
      post: {
        tags: ['Favorites'],
        summary: 'Add a favorite',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['type', 'ratingKey'],
                properties: {
                  type: { type: 'string', enum: ['track', 'album', 'artist', 'playlist'] },
                  ratingKey: { type: 'string' },
                  title: { type: 'string' },
                  thumb: { type: 'string' },
                  subtitle: { type: 'string', description: 'Artist for a track or album' },
                  year: { type: 'integer' },
                  duration: { type: 'integer' },
                  partKey: { type: 'string' },
                  parentRatingKey: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Added.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Favorite' } } } },
          400: { description: 'type and ratingKey are required.', ...errorBody },
          401: unauthorized,
          409: { description: 'Already a favorite.', ...errorBody }
        }
      }
    },
    '/api/favorites/{type}/{ratingKey}': {
      delete: {
        tags: ['Favorites'],
        summary: 'Remove a favorite',
        parameters: [
          { name: 'type', in: 'path', required: true, schema: { type: 'string', enum: ['track', 'album', 'artist', 'playlist'] } },
          { name: 'ratingKey', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Removed.', ...successFlag }, 401: unauthorized, 404: notFound }
      }
    },
    '/api/custom-playlists': {
      get: {
        tags: ['Playlists'],
        summary: "List this account's playlists",
        responses: {
          200: { description: 'Playlists, newest first.', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/CustomPlaylist' } } } } },
          401: unauthorized
        }
      },
      post: {
        tags: ['Playlists'],
        summary: 'Create a playlist',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: { name: { type: 'string', example: 'Road trip' }, genre: { type: 'string', nullable: true, example: 'Jazz' } }
              }
            }
          }
        },
        responses: {
          201: { description: 'Created.', content: { 'application/json': { schema: { $ref: '#/components/schemas/CustomPlaylist' } } } },
          400: { description: 'A name is required.', ...errorBody },
          401: unauthorized
        }
      }
    },
    '/api/custom-playlists/{id}': {
      delete: {
        tags: ['Playlists'],
        summary: 'Delete a playlist',
        description: 'Its tracks go with it.',
        parameters: [playlistIdParam],
        responses: { 200: { description: 'Deleted.', ...successFlag }, 401: unauthorized, 404: notFound }
      }
    },
    '/api/custom-playlists/{id}/tracks': {
      get: {
        tags: ['Playlists'],
        summary: 'Tracks on a playlist',
        parameters: [playlistIdParam],
        responses: {
          200: {
            description: 'The playlist and its tracks, in playlist order.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    playlist: { $ref: '#/components/schemas/CustomPlaylist' },
                    tracks: { type: 'array', items: { $ref: '#/components/schemas/PlaylistTrack' } }
                  }
                }
              }
            }
          },
          401: unauthorized,
          404: notFound
        }
      },
      post: {
        tags: ['Playlists'],
        summary: 'Add a track to a playlist',
        description: 'Appended at the end.',
        parameters: [playlistIdParam],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['ratingKey'],
                properties: {
                  ratingKey: { type: 'string' },
                  title: { type: 'string' },
                  artist: { type: 'string' },
                  album: { type: 'string' },
                  duration: { type: 'integer' },
                  thumb: { type: 'string' },
                  partKey: { type: 'string' },
                  parentRatingKey: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Added.', content: { 'application/json': { schema: { $ref: '#/components/schemas/PlaylistTrack' } } } },
          400: { description: 'ratingKey is required.', ...errorBody },
          401: unauthorized,
          404: notFound,
          409: { description: 'That track is already on the playlist.', ...errorBody }
        }
      }
    },
    '/api/custom-playlists/{id}/tracks/reorder': {
      patch: {
        tags: ['Playlists'],
        summary: 'Reorder a playlist',
        description: 'Applied in one transaction, so a failure leaves the order untouched.',
        parameters: [playlistIdParam],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['order'],
                properties: {
                  order: {
                    type: 'array',
                    description: 'Every track with its new position.',
                    items: {
                      type: 'object',
                      required: ['id', 'position'],
                      properties: {
                        id: { type: 'integer', description: 'Playlist row id, not the Plex ratingKey' },
                        position: { type: 'integer' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Reordered.', ...successFlag },
          400: { description: 'A non-empty order array is required.', ...errorBody },
          401: unauthorized,
          404: notFound
        }
      }
    },
    '/api/custom-playlists/{id}/tracks/{trackId}': {
      delete: {
        tags: ['Playlists'],
        summary: 'Remove a track from a playlist',
        parameters: [
          playlistIdParam,
          { name: 'trackId', in: 'path', required: true, description: 'Playlist row id, not the Plex ratingKey.', schema: { type: 'integer' } }
        ],
        responses: { 200: { description: 'Removed.', ...successFlag }, 401: unauthorized, 404: notFound }
      }
    },
    '/api/custom-playlists/{id}/export-m3u': {
      get: {
        tags: ['Playlists'],
        summary: 'Export a playlist as M3U',
        description: 'The returned file embeds the Plex token in each URL, so treat it as a secret.',
        parameters: [playlistIdParam],
        responses: {
          200: { description: 'An M3U playlist.', content: { 'audio/x-mpegurl': { schema: { type: 'string' } } } },
          401: unauthorized,
          404: notFound
        }
      }
    }
  }
};
