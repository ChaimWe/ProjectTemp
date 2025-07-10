import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, useTheme, CircularProgress, Alert } from '@mui/material';
import { useParams } from 'react-router-dom';

export default function AlbAclPage() {
  const theme = useTheme();
  const { albId, aclId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`http://localhost:5000/api/alb-acl/${albId}/${aclId}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch ALB+ACL details');
        return res.json();
      })
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [albId, aclId]);

  return (
    <Box sx={{ minHeight: '100vh', pt: 8, px: 2, background: theme.palette.background.default }}>
      <Paper elevation={3} sx={{ maxWidth: 700, mx: 'auto', mt: 6, p: { xs: 2, sm: 4 }, borderRadius: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          ALB + ACL Details
        </Typography>
        <Typography variant="h6" sx={{ mb: 2 }}>
          ALB ID: {albId} | ACL ID: {aclId}
        </Typography>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : data ? (
          <Box>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>ALB Name:</strong> {data.alb?.name}
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>ALB Region:</strong> {data.alb?.region}
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Attached ACLs:</strong> {data.alb?.attachedAcls?.join(', ') || 'None'}
            </Typography>
            <Typography variant="body1" sx={{ mt: 2, mb: 1 }}>
              <strong>ACL Name:</strong> {data.acl?.name}
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>ACL Rules:</strong> {Array.isArray(data.acl?.rules) ? data.acl.rules.length : 0}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No ALB+ACL data found.
          </Typography>
        )}
      </Paper>
    </Box>
  );
} 