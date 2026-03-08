import { createContext, useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = sessionStorage.getItem('token');
        const storedUser = sessionStorage.getItem('user');
        if (token && storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            const { data } = await api.post('/auth/login', { username, password });
            sessionStorage.setItem('token', data.token);
            sessionStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user);
            toast.success('Welcome back!');
            return true;
        } catch (error) {
            console.error(error);
            const message = error.response?.data?.message || error.message || 'Login failed';
            toast.error(message);
            return message;
        }
    };

    const register = async (username, email, password) => {
        try {
            await api.post('/auth/register', { username, email, password });
            toast.success('Registration successful! Please login.');
            return true;
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || error.message || 'Registration failed');
            return false;
        }
    };

    const logout = () => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        setUser(null);
        toast.success('Logged out');
    };

    // Patch user fields (e.g. after group selection) without re-login
    const updateUser = (fields) => {
        setUser(prev => {
            const updated = { ...prev, ...fields };
            sessionStorage.setItem('user', JSON.stringify(updated));
            return updated;
        });
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
