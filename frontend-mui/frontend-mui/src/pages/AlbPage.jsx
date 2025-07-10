import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, useTheme, CircularProgress, Alert } from '@mui/material';
import { useParams } from 'react-router-dom';

export default function AlbPage() {
  const theme = useTheme();
  const { albId } = useParams();
  const [alb, setAlb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`http://localhost:5000/api/alb/${albId}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch ALB');
        return res.json();
      })
      .then(data => {
        setAlb(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [albId]);

  return (
    <Box sx={{ minHeight: '100vh', pt: 8, px: 2, background: theme.palette.background.default }}>
      <Paper elevation={3} sx={{ maxWidth: 700, mx: 'auto', mt: 6, p: { xs: 2, sm: 4 }, borderRadius: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          Application Load Balancer (ALB)
        </Typography>
        <Typography variant="h6" sx={{ mb: 2 }}>
          ALB ID: {albId}
        </Typography>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : alb ? (
          <Box>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Name:</strong> {alb.name}
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Region:</strong> {alb.region}
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Attached ACLs:</strong> {alb.attachedAcls && alb.attachedAcls.length > 0 ? alb.attachedAcls.join(', ') : 'None'}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No ALB data found.
          </Typography>
        )}
      </Paper>
    </Box>
  );
} 