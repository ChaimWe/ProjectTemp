// theme.js
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light', // Change to 'dark' for dark mode
    primary: {
      main: '#1976d2', // Change to your preferred primary color
    },
    secondary: {
      main: '#9c27b0',
    },
  },
  // You can add typography, spacing, etc. here
});

export default theme;
