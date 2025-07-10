import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import { DataSourceProvider } from './context/DataSourceContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DataSourceProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
    <App />
      </ThemeProvider>
    </DataSourceProvider>
  </StrictMode>,
)
