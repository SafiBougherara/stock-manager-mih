/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Active le mode sombre basé sur les classes
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Ajout de couleurs personnalisées pour le thème sombre si nécessaire
      },
    },
  },
  plugins: [],
}
