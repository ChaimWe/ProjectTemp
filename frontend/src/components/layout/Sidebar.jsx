import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  IconButton,
  Fade,
  Tooltip,
} from '@mui/material';
import {
  AccountTree as TreeIcon,
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  BugReport as DebugIcon,
  SmartToy as AIIcon,
  MergeType as MergeIcon
} from '@mui/icons-material';
import HomeIcon from '@mui/icons-material/Home';
import { useThemeContext } from '../../context/ThemeContext';

const drawerWidth = 240;

/**
 * Sidebar component renders the main navigation drawer with menu items and theme toggle.
 * Handles navigation and theme switching.
 */
export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { darkTheme, getColor } = useThemeContext();

  const isSelected = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.includes(path);
  };

  /**
   * Menu items for navigation and theme toggle.
   */
  const menuItems = [
    { key: 'home', label: 'Home', icon: <HomeIcon sx={{ color: getColor('barText') }} />, onClick: () => navigate('/'), path: '/' },
    { key: 'tree', label: 'WAF Tree', icon: <TreeIcon sx={{ color: getColor('barText') }} />, onClick: () => navigate('/app/visualization'), path: '/visualization' },
    // New menu item for WAF & ALB Visualizer
    { key: 'wafalb', label: 'WAF & ALB Visualizer', icon: <MergeIcon sx={{ color: getColor('barText') }} />, onClick: () => navigate('/app/waf-alb-visualizer'), path: '/waf-alb-visualizer' },
    { key: 'debugger', label: 'Request Debugger', icon: <DebugIcon sx={{ color: getColor('barText') }} />, onClick: () => navigate('/app/debugger'), path: '/debugger' },
    { key: 'ai', label: 'AI Assistant', icon: <AIIcon sx={{ color: getColor('barText') }} />, onClick: () => navigate('/app/ai'), path: '/app/ai' },
  ];

  return (
    <Drawer
      variant="permanent"
      open={open}
      sx={{
        zIndex: 1300,
        width: open ? drawerWidth : '80px',
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: open ? drawerWidth : '80px',
          boxSizing: 'border-box',
          background: darkTheme ? '#181818' : '#fff',
          color: darkTheme ? '#fff' : '#333',
          borderRight: 'none',
          boxShadow: '4px 0 12px rgba(0,0,0,0.1)',
          overflowX: 'hidden',
          transition: (theme) => theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        },
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          px: [1],
        }}
      >
        <IconButton onClick={() => setOpen(!open)}>
          {open ? <ChevronLeftIcon sx={{color: darkTheme ? '#fff' : '#333'}} /> : <MenuIcon sx={{color: darkTheme ? '#fff' : '#333'}} />}
        </IconButton>
      </Toolbar>
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.key} disablePadding>
            <ListItemButton
              selected={isSelected(item.path)}
              onClick={item.onClick}
              sx={{
                minHeight: 48,
                justifyContent: 'initial',
                px: 2.5,
                '&.Mui-selected': {
                  bgcolor: getColor('selected'),
                  '&:hover': {
                    bgcolor: getColor('selectedHover'),
                  },
                },
                '&:hover': {
                  bgcolor: getColor('hover'),
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: 2,
                  justifyContent: 'center',
                  color:
                    getColor('barText')
                }}
              >
                <Tooltip
                  title={!open ? item.label : ''}
                  placement="right"
                >
                  <span>{item.icon}</span>
                </Tooltip>
              </ListItemIcon>

              <Fade in={open} timeout={400} unmountOnExit>
                <ListItemText
                  primary={item.label}
                  sx={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    '& .MuiTypography-root': {
                      fontWeight: isSelected(item.path) ? 600 : 400,
                      color: getColor('barText')
                    },
                  }}
                />
              </Fade>
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
}