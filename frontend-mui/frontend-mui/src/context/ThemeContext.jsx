import React, { createContext, useContext, useState, useMemo } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [darkTheme, setDarkTheme] = useState(false);
    // Basic getColor implementation
    const getColor = (key) => {
        const colors = darkTheme
            ? { barText: '#fff', background: '#222', border: '#444', shadow: '0 2px 8px #000' }
            : { barText: '#222', background: '#fff', border: '#ccc', shadow: '0 2px 8px #aaa' };
        return colors[key] || '#000';
    };
    const value = useMemo(() => ({ darkTheme, setDarkTheme, getColor }), [darkTheme]);
    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
    return useContext(ThemeContext);
} 