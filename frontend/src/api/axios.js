import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // send/receive the HTTP-only JWT cookie
  headers: { 'Content-Type': 'application/json' },
});

export default api;
