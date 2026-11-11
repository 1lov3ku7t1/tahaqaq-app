// app.json plus an optional sub-path for hosting (GitHub Pages): BASE_URL=/tahaqaq-app npx expo export -p web
module.exports = ({ config }) => ({ ...config, experiments: { ...(config.experiments || {}), ...(process.env.BASE_URL ? { baseUrl: process.env.BASE_URL } : {}) } });
