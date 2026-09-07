import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from '../docs/openapi';

const router = Router();

/**
 * Interactive API documentation at /api/docs.
 *
 * Unauthenticated, so the reference is readable before signing in — it
 * describes the shape of the API and returns none of its data. "Try it out"
 * runs against this same origin with the browser's own session cookie, so any
 * request it makes is one the caller could already make by hand.
 *
 * Set API_DOCS_ENABLED=false to leave it unmounted on a public deployment.
 */
export const apiDocsEnabled = process.env.API_DOCS_ENABLED !== 'false';

// The raw document, for generating clients or importing into other tooling.
router.get('/openapi.json', (req, res) => {
  res.json(openApiDocument);
});

router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(openApiDocument, {
  customSiteTitle: 'Plex Web Client API',
  swaggerOptions: {
    // Collapsed by default: the surface is wide enough that a fully expanded
    // page is harder to scan than a list of tags.
    docExpansion: 'none',
    filter: true,
    persistAuthorization: true,
    tryItOutEnabled: true
  }
}));

export default router;
