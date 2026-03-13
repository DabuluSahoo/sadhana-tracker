import axios from 'axios';

const api = axios.create({
    baseURL: 'https://sadhana-tracker.onrender.com/api',
});

// Interceptor to handle token for Web (sessionStorage)
// On Mobile, AuthContext sets api.defaults.headers.common['Authorization'] directly
api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
