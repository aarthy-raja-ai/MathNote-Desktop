import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { tokens } from './tokens';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
    mode: ThemeMode;
    isDark: boolean;
    colors: typeof tokens.colors;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [mode, setMode] = useState<ThemeMode>(() => {
        const saved = localStorage.getItem('mathnote_theme');
        return (saved as ThemeMode) || 'light';
    });

    const isDark = mode === 'dark';
    const colors = isDark ? { ...tokens.colors, ...tokens.darkColors } : tokens.colors;

    useEffect(() => {
        localStorage.setItem('mathnote_theme', mode);
        document.documentElement.setAttribute('data-theme', mode);
    }, [mode]);

    const toggleTheme = () => setMode(prev => prev === 'light' ? 'dark' : 'light');

    return (
        <ThemeContext.Provider value={{ mode, isDark, colors, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
};
