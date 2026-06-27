// Design Tokens for MathNote Desktop — matches mobile app
export const tokens = {
    colors: {
        brand: {
            primary: '#6366F1',
            secondary: '#0F172A',
        },
        semantic: {
            success: '#10B981',
            error: '#EF4444',
            warning: '#F59E0B',
            soft: '#F1F5F9',
            background: '#F8FAFC',
            surface: '#FFFFFF',
        },
        text: {
            primary: '#1E293B',
            secondary: '#64748B',
            inverse: '#FFFFFF',
            muted: '#94A3B8',
        },
        border: {
            default: '#E2E8F0',
            light: '#F1F5F9',
        },
        icon: {
            active: '#6366F1',
            inactive: '#94A3B8',
            activeBackground: 'rgba(99,102,241,0.12)',
        },
        chart: [
            '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
            '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#84CC16',
        ],
    },

    // Dark mode overrides
    darkColors: {
        brand: {
            primary: '#818CF8',
            secondary: '#F8FAFC',
        },
        semantic: {
            success: '#34D399',
            error: '#F87171',
            warning: '#FBBF24',
            soft: '#1E293B',
            background: '#0F172A',
            surface: '#1E293B',
        },
        text: {
            primary: '#F1F5F9',
            secondary: '#94A3B8',
            inverse: '#0F172A',
            muted: '#64748B',
        },
        border: {
            default: '#334155',
            light: '#1E293B',
        },
        icon: {
            active: '#818CF8',
            inactive: '#64748B',
            activeBackground: 'rgba(129,140,248,0.15)',
        },
        chart: [
            '#818CF8', '#34D399', '#FBBF24', '#F87171', '#A78BFA',
            '#F472B6', '#2DD4BF', '#FB923C', '#22D3EE', '#A3E635',
        ],
    },

    typography: {
        fontFamily: "'Exo 2', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        sizes: {
            xs: '0.75rem',
            sm: '0.875rem',
            md: '1rem',
            lg: '1.25rem',
            xl: '1.5rem',
            xxl: '2rem',
            xxxl: '2.5rem',
        },
        weight: {
            light: 300,
            regular: 400,
            medium: 500,
            semibold: 600,
            bold: 700,
        },
    },

    spacing: {
        xxs: '0.25rem',
        xs: '0.5rem',
        sm: '0.75rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        xxl: '3rem',
    },

    radius: {
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        full: '9999px',
    },

    shadows: {
        sm: '0 1px 2px rgba(0,0,0,0.05)',
        md: '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)',
        lg: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.05)',
        xl: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)',
        glow: '0 0 20px rgba(99,102,241,0.15)',
    },

    motion: {
        fast: '150ms ease',
        normal: '250ms ease',
        slow: '350ms ease',
    },
};
