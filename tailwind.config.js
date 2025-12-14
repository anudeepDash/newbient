/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: "#0B0F17",
        'neon-green': "#39FF14", // Updated to match logo
        'neon-pink': "#FF4F8B",
        'neon-blue': "#00F0FF",
        glass: "rgba(255, 255, 255, 0.05)",
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        'neon-green': '0 0 10px #39FF14, 0 0 20px #39FF14',
        'neon-pink': '0 0 10px #FF4F8B, 0 0 20px #FF4F8B',
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
      },
    },
  },
  plugins: [],
}
