import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// This "Interceptor" automatically attaches the User's Passport (Token) 
// to every request we send to the backend.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('timeflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
