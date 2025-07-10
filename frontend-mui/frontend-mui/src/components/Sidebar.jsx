import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  useTheme,
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

const drawerWidth = 240;

export default function Sidebar({ open, setOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  const isSelected = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.includes(path);
  };

  const menuItems = [
    { key: 'home', label: 'Home', icon: <HomeIcon />, onClick: () => navigate('/') },
    { key: 'tree', label: 'WAF Tree', icon: <TreeIcon />, onClick: () => navigate('/explorer') },
    { key: 'wafalb', label: 'WAF & ALB Visualizer', icon: <MergeIcon />, onClick: () => navigate('/alb-acl/1/1') },
    { key: 'debugger', label: 'Request Debugger', icon: <DebugIcon />, onClick: () => navigate('/debugger') },
    { key: 'ai', label: 'AI Assistant', icon: <AIIcon />, onClick: () => navigate('/ai') },
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
          background: theme.palette.mode === 'dark' ? '#181818' : '#fff',
          color: theme.palette.mode === 'dark' ? '#fff' : '#333',
          borderRight: 'none',
          boxShadow: '4px 0 12px rgba(0,0,0,0.1)',
          overflowX: 'hidden',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          top: '64px',
          height: 'calc(100% - 64px)',
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
          {open ? <ChevronLeftIcon sx={{ color: theme.palette.text.primary }} /> : <MenuIcon sx={{ color: theme.palette.text.primary }} />}
        </IconButton>
      </Toolbar>
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.key} disablePadding>
            <ListItemButton
              selected={isSelected(item.key === 'home' ? '/' : item.key === 'tree' ? '/explorer' : item.key === 'wafalb' ? '/alb-acl' : item.key === 'debugger' ? '/debugger' : item.key === 'ai' ? '/ai' : '')}
              onClick={item.onClick}
              sx={{
                minHeight: 48,
                justifyContent: 'initial',
                px: 2.5,
                '&.Mui-selected': {
                  bgcolor: theme.palette.action.selected,
                  '&:hover': {
                    bgcolor: theme.palette.action.selected,
                  },
                },
                '&:hover': {
                  bgcolor: theme.palette.action.hover,
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: 2,
                  justifyContent: 'center',
                  color: theme.palette.text.primary,
                }}
              >
                <Tooltip title={!open ? item.label : ''} placement="right">
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
                      color: theme.palette.text.primary,
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