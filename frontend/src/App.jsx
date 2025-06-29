import { Routes, Route, Navigate, useOutletContext } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { CssBaseline } from '@mui/material';
import HomePage from './pages/HomePage';
import ExplorerPage from './pages/ExplorerPage';
import AboutPage from './pages/AboutPage';
import AIPage from './pages/AIPage';
import RequestDebugger from './debugger/RequestDebugger';
import AppLayout from './AppLayout';
import AppPlaceholder from './pages/AppPlaceholder';

function DebuggerWithContext() {
  const { data } = useOutletContext();
  return <RequestDebugger rules={data} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <CssBaseline />
      <div style={{ 
        height: '100vh', 
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Routes>
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<AppPlaceholder />} />
            <Route path="visualization" element={<ExplorerPage />} />
            <Route path="debugger" element={<DebuggerWithContext />} />
            <Route path="ai" element={<AIPage />} />
          </Route>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </div>
    </ThemeProvider>
  );
}