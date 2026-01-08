/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./public/index.html",
    ],
    theme: {
        extend: {
            colors: {
                'glass-blue': {
                    50: '#e6f2ff',
                    100: '#b3d9ff',
                    200: '#80c0ff',
                    300: '#4da6ff',
                    400: '#1a8cff',
                    500: '#0073e6',
                    600: '#005bb3',
                    700: '#004380',
                    800: '#002b4d',
                    900: '#00131a',
                },
            },
        },
    },
    plugins: [],
};
