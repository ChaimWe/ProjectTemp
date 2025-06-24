import React from 'react';
import { Box, Typography } from '@mui/material';

const AppPlaceholder = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '60vh', color: '#220d4e', textAlign: 'center' }}>
    <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
      Welcome to the AWS WAF App
    </Typography>
    <Typography variant="body1">
      Please select <b>Visualization</b> or <b>Debugger</b> from the sidebar to get started.
    </Typography>
  </Box>
);

export default AppPlaceholder; 