import React, { createContext, useContext, useState, useMemo } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [darkTheme, setDarkTheme] = useState(false);
    const value = useMemo(() => ({ darkTheme, setDarkTheme }), [darkTheme]);
    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
    return useContext(ThemeContext);
} 