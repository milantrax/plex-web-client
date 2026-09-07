import React, { useEffect, useState } from 'react';
import {
  Box, Typography, TextField, Button, Alert, Chip, Stack, Link,
  InputAdornment, IconButton, CircularProgress, Divider,
  Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useAuth } from '../contexts/AuthContext';
import { getApiErrorMessage } from '../utils/errors';
import { getPlexDefaults } from '../api/configApi';
import type { PlexDefaults } from '../api/configApi';

interface SaveStatus {
  success: boolean;
  message: string;
}

/** The payload of GET /api/plex/test-connection. */
interface TestResult {
  success: boolean;
  serverName?: string;
  version?: string;
  error?: string;
}

const TOKEN_HELP_URL =
  'https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/';

const TOKEN_STEPS = [
  'Open Plex Web (app.plex.tv) and sign in.',
  'Browse to any movie, episode or album in your library and open it.',
  'Click the ⋮ (more) button on the item and choose "Get Info".',
  'In the dialog that opens, click "View XML" — a new browser tab appears.',
  'Look at that tab\'s address bar and copy the value after X-Plex-Token=.'
];

const LibrarySettings = () => {
  const { user, updateProfile } = useAuth();

  const [plexUrl, setPlexUrl] = useState(user?.plexUrl || '');
  const [plexToken, setPlexToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [defaults, setDefaults] = useState<PlexDefaults>({ defaultPlexUrl: null, hasDefaultToken: false });

  // The server-configured fallback, shown as placeholder text so it is clear
  // what an empty field will actually connect to.
  useEffect(() => {
    let active = true;
    getPlexDefaults().then(result => {
      if (active) setDefaults(result);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/plex/test-connection', { credentials: 'include' });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ success: false, error: 'Network error' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);

    try {
      await updateProfile(
        plexUrl.trim() || null,
        plexToken.trim() || null
      );
      setPlexToken('');
      setSaveStatus({ success: true, message: 'Settings saved successfully' });
    } catch (err) {
      setSaveStatus({ success: false, message: getApiErrorMessage(err, 'Failed to save settings') });
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    setSaving(true);
    try {
      await updateProfile(null, null);
      setPlexUrl('');
      setPlexToken('');
      setSaveStatus({ success: true, message: 'Reset to default server' });
    } catch {
      setSaveStatus({ success: false, message: 'Failed to reset' });
    } finally {
      setSaving(false);
    }
  };

  const urlPlaceholder = defaults.defaultPlexUrl || 'http://192.168.1.100:32400';
  const tokenPlaceholder = user?.hasCustomPlex
    ? '••••••••'
    : defaults.hasDefaultToken
      ? 'Using the server default'
      : 'Paste your Plex token';

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
        Plex Server
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Where this app reads your music library from.
      </Typography>

      {!user?.hasCustomPlex && (
        <Chip
          label={
            defaults.defaultPlexUrl
              ? `Using default server — ${defaults.defaultPlexUrl}`
              : 'Using default server'
          }
          size="small"
          color="info"
          variant="outlined"
          sx={{ mb: 2 }}
        />
      )}

      {saveStatus && (
        <Alert
          severity={saveStatus.success ? 'success' : 'error'}
          sx={{ mb: 2 }}
          onClose={() => setSaveStatus(null)}
        >
          {saveStatus.message}
        </Alert>
      )}

      <Stack spacing={2}>
        <TextField
          label="Plex Server URL"
          placeholder={urlPlaceholder}
          fullWidth
          value={plexUrl}
          onChange={(e) => setPlexUrl(e.target.value)}
          helperText={
            defaults.defaultPlexUrl
              ? `Leave empty to use the default server (${defaults.defaultPlexUrl})`
              : 'Leave empty to use the default server'
          }
          size="small"
        />

        <TextField
          label="Plex Token"
          type={showToken ? 'text' : 'password'}
          placeholder={tokenPlaceholder}
          fullWidth
          value={plexToken}
          onChange={(e) => setPlexToken(e.target.value)}
          helperText="Leave empty to keep the current token"
          size="small"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowToken(!showToken)} size="small">
                  {showToken ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                </IconButton>
              </InputAdornment>
            )
          }}
        />

        {testResult && (
          <Alert
            severity={testResult.success ? 'success' : 'error'}
            icon={testResult.success ? <CheckCircleIcon /> : <ErrorIcon />}
          >
            {testResult.success
              ? `Connected: ${testResult.serverName} (v${testResult.version})`
              : `Connection failed: ${testResult.error}`}
          </Alert>
        )}

        <Stack direction="row" spacing={1.5} flexWrap="wrap" gap={1}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            sx={{ fontWeight: 600, textTransform: 'none' }}
          >
            {saving ? <CircularProgress size={18} color="inherit" /> : 'Save'}
          </Button>

          <Button
            variant="outlined"
            onClick={handleTestConnection}
            disabled={testing}
            sx={{ fontWeight: 600, textTransform: 'none' }}
          >
            {testing ? <CircularProgress size={18} color="inherit" /> : 'Test Connection'}
          </Button>

          {user?.hasCustomPlex && (
            <Button
              variant="text"
              color="inherit"
              onClick={handleResetToDefault}
              disabled={saving}
              sx={{ fontWeight: 600, textTransform: 'none', color: 'text.secondary' }}
            >
              Reset to Default
            </Button>
          )}
        </Stack>
      </Stack>

      <Divider sx={{ my: 3 }} />

      <Accordion
        disableGutters
        elevation={0}
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          '&::before': { display: 'none' }
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack direction="row" spacing={1} alignItems="center">
            <HelpOutlineIcon fontSize="small" color="primary" />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              How do I find my Plex token?
            </Typography>
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Box component="ol" sx={{ pl: 2.5, m: 0, '& li': { mb: 1 } }}>
            {TOKEN_STEPS.map((step, index) => (
              <li key={index}>
                <Typography variant="body2" color="text.secondary">
                  {step}
                </Typography>
              </li>
            ))}
          </Box>

          <Alert severity="warning" sx={{ mt: 2 }}>
            Your token grants full access to your Plex account — treat it like a
            password and do not share it.
          </Alert>

          <Typography variant="body2" sx={{ mt: 2 }}>
            <Link href={TOKEN_HELP_URL} target="_blank" rel="noopener noreferrer" underline="hover">
              Plex's own guide to finding a token
            </Link>
          </Typography>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default LibrarySettings;
