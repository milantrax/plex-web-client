import React, { useState } from 'react';
import {
  Box, Typography, TextField, Button, Alert, Chip, Stack,
  InputAdornment, IconButton, Divider, CircularProgress
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { useAuth } from '../contexts/AuthContext';

const AccountSettings = () => {
  const { user, updateProfile } = useAuth();

  const [plexUrl, setPlexUrl] = useState(user?.plexUrl || '');
  const [plexToken, setPlexToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [testResult, setTestResult] = useState(null);

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
      setSaveStatus({ success: false, message: err.response?.data?.error || 'Failed to save settings' });
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

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
        Account
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        Signed in as <strong>{user?.username}</strong>
        {user?.email && ` (${user.email})`}
      </Typography>

      <Divider sx={{ mb: 3 }} />

      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
        Plex Server
      </Typography>

      {!user?.hasCustomPlex && (
        <Chip
          label="Using default server"
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
          placeholder="http://192.168.1.100:32400"
          fullWidth
          value={plexUrl}
          onChange={(e) => setPlexUrl(e.target.value)}
          helperText="Leave empty to use the default server"
          size="small"
        />

        <TextField
          label="Plex Token"
          type={showToken ? 'text' : 'password'}
          placeholder={user?.hasCustomPlex ? '••••••••' : 'Enter token to override default'}
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
    </Box>
  );
};

export default AccountSettings;
