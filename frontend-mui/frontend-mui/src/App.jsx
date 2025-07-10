import * as React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Outlet } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import InboxIcon from '@mui/icons-material/MoveToInbox';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MenuIcon from '@mui/icons-material/Menu';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import HomePage from './pages/HomePage';
import ExplorerPage from './pages/ExplorerPage';
import AboutPage from './pages/AboutPage';
import AlbPage from './pages/AlbPage';
import AlbAclPage from './pages/AlbAclPage';
import AIPage from './pages/AIPage';
import { ThemeProvider } from './context/ThemeContext';

const drawerWidth = 240;

const navItems = [
  { text: 'Home', path: '/' },
  { text: 'Explorer', path: '/explorer' },
  { text: 'About', path: '/about' },
  { text: 'AI', path: '/ai' },
  { text: 'ALB', path: '/alb/1' }, // Example static ALB id for navigation
  { text: 'ALB + ACL', path: '/alb-acl/1/1' }, // Example static ids
];

function AppLayout() {
  const [rules, setRules] = React.useState([]);
  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <Topbar title="WAF Visualization Tool" />
      <Sidebar open={true} setOpen={() => {}} />
      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - 240px)` }, mt: '64px' }}
      >
        <Toolbar />
        <Outlet context={{ data: rules, setData: setRules }} />
      </Box>
    </Box>
  );
}

export default function App(props) {
  const [mobileOpen, setMobileOpen] = React.useState(true); // Sidebar open by default

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="explorer" element={<ExplorerPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="ai" element={<AIPage />} />
            <Route path="alb/:albId" element={<AlbPage />} />
            <Route path="alb-acl/:albId/:aclId" element={<AlbAclPage />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
