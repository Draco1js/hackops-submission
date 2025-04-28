// Mock import.meta.env
global.import = {};
global.import.meta = { env: { PROD: false, VITE_API_URL: 'http://localhost:3001' } };