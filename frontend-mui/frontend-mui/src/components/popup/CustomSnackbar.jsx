import React from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

const CustomSnackbar = ({ open, message, severity = 'info', autoHideDuration = 3000, onClose }) => (
  <Snackbar
    open={open}
    autoHideDuration={autoHideDuration}
    onClose={onClose}
    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
  >
    <Alert onClose={onClose} severity={severity} sx={{ width: '100%' }}>
      {message}
    </Alert>
  </Snackbar>
);

export default CustomSnackbar; 