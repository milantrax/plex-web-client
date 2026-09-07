import React from 'react';
import { Box, Typography, Stack, Button, Divider } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/** One label/value row of the account summary. */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 600, textTransform: 'uppercase', display: 'block' }}
      >
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}

function formatJoined(createdAt?: string): string | null {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

const AccountSettings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const joined = formatJoined(user?.createdAt);

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
        Account
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        The details this app knows about you.
      </Typography>

      <Stack spacing={2}>
        <Field label="Email" value={user?.email || '—'} />
        <Field label="Display name" value={user?.username || '—'} />
        {joined && <Field label="Member since" value={joined} />}
      </Stack>

      <Divider sx={{ my: 3 }} />

      <Button
        variant="outlined"
        color="error"
        startIcon={<LogoutIcon />}
        onClick={handleSignOut}
        sx={{ fontWeight: 600, textTransform: 'none' }}
      >
        Sign out
      </Button>
    </Box>
  );
};

export default AccountSettings;
