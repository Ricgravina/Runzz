/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // New Palette (Based on User Image - Refined)
                // Background: Dark Green (Deep Forest)
                background: '#386641',

                // Surface: Cream (Warm Light)
                surface: '#f2e8cf',

                // Primary: Bright Lime Green (Vibrant)
                primary: '#B6D654', // Brighter/Yellow-ish Green
                onPrimary: '#1a2f1d', // Darker Text for contrast on bright green

                // Secondary: Red (Accent/Action)
                secondary: '#bc4749',
                onSecondary: '#f2e8cf',

                // Text:
                text: '#f2e8cf',          // Default (on background)
                'text-inverse': '#1a2f1d', // Darker Green (Almost Black) for cards
                'text-dim': '#4a5e4d',    // High contrast neutral (Dark Grey/Green) for readability

                // Semantic
                success: '#6a994e', // Medium Green
                onSuccess: '#f2e8cf',

                error: '#bc4749',   // Red
                warning: '#ec9a9a', // Light Red/Pinkish
                onWarning: '#1a2f1d',
            },
            fontFamily: {
                sans: ['Outfit', 'sans-serif'],
                mono: ['Space Mono', 'monospace'],
                display: ['Outfit', 'sans-serif'],
            },
            borderRadius: {
                '4xl': '2.5rem',
                '5xl': '3rem',
            },
            fontSize: {
                xxs: ['10px', '1.1'],
            }
        },
    },
    plugins: [],
}
