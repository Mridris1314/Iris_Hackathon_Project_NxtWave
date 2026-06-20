/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B0B0F", surface: "#15151C", line: "#2A2A33",
        bone: "#F5F3EC", muted: "#9C9A92",
        iris: "#E8A33D", irisdeep: "#B97A1E",
        good: "#5DCAA5", bad: "#E24B4A",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "system-ui", "sans-serif"],
        body: ['"Hanken Grotesk"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
