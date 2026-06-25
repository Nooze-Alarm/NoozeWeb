/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{astro,html,js}'],
    theme: {
        extend: {
            fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
            colors: {
                primary: { DEFAULT: '#00bcd4', dark: '#0097a7', light: '#26c6da' },
                accent: { DEFAULT: '#0e7490', light: '#06b6d4' },
            },
        },
    },
    plugins: [],
}
