import { createContext, useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { isNative } from '../utils/platform';
import { Preferences } from '@capacitor/preferences';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { LocalNotifications } from '@capacitor/local-notifications';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [biometricEnabled, setBiometricEnabled] = useState(false);

    useEffect(() => {
        const loadStoredAuth = async () => {
            if (isNative()) {
                const token = await Preferences.get({ key: 'token' });
                const user = await Preferences.get({ key: 'user' });
                const bioPref = await Preferences.get({ key: 'biometricEnabled' });
                const isBioOn = bioPref.value === 'true';
                setBiometricEnabled(isBioOn);

                if (token.value && user.value) {
                    let authSuccess = true;
                    if (isBioOn) {
                        try {
                            const info = await BiometricAuth.checkBiometry();
                            if (info.isAvailable) {
                                await BiometricAuth.authenticate({ reason: 'Unlock Sadhana Tracker' });
                                // If we reach here, it authenticated.
                            }
                        } catch (err) {
                            console.error('Biometric authentication failed:', err);
                            authSuccess = false;
                        }
                    }
                    
                    if (authSuccess) {
                        setUser(JSON.parse(user.value));
                        api.defaults.headers.common['Authorization'] = `Bearer ${token.value}`;
                    } else {
                        // Securely wipe memory variables if biometric fails/cancels
                        api.defaults.headers.common['Authorization'] = '';
                    }
                }
            } else {
                const token = sessionStorage.getItem('token');
                const storedUser = sessionStorage.getItem('user');
                if (token && storedUser) {
                    setUser(JSON.parse(storedUser));
                }
            }
            setLoading(false);
        };
        loadStoredAuth();
    }, []);

    const login = async (username, password) => {
        try {
            const { data } = await api.post('/auth/login', { username, password });
            
            if (isNative()) {
                await Preferences.set({ key: 'token', value: data.token });
                await Preferences.set({ key: 'user', value: JSON.stringify(data.user) });
            } else {
                sessionStorage.setItem('token', data.token);
                sessionStorage.setItem('user', JSON.stringify(data.user));
            }

            api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;

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

    const logout = async () => {
        if (isNative()) {
            try {
                // 1. Immediately clear the sticky reminder from the tray
                await LocalNotifications.cancel({ notifications: [{ id: 108 }] });
                console.log('Sticky reminder cleared on logout');

                // 2. Tell the server to remove the device token association
                await api.post('/auth/unregister-device');
                console.log('Device token unregistered from server');
            } catch (err) {
                console.error('Failed to cleanup notifications/token on logout:', err);
            }
            await Preferences.remove({ key: 'token' });
            await Preferences.remove({ key: 'user' });
        } else {
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
        }
        setUser(null);
        toast.success('Logged out');
    };

    // Patch user fields (e.g. after group selection) without re-login
    const updateUser = async (fields) => {
        setUser(prev => {
            const updated = { ...prev, ...fields };
            if (isNative()) {
                Preferences.set({ key: 'user', value: JSON.stringify(updated) });
            } else {
                sessionStorage.setItem('user', JSON.stringify(updated));
            }
            return updated;
        });
    };

    const toggleBiometric = async () => {
        if (!isNative()) {
            toast.error('Biometric lock is only available on the mobile app.');
            return false;
        }
        
        try {
            const info = await BiometricAuth.checkBiometry();
            if (!info.isAvailable) {
                toast.error('Biometric hardware is not available on this device.');
                return false;
            }

            const newState = !biometricEnabled;
            // Ask for fingerprint before *enabling* it to confirm ownership
            if (newState) {
                try {
                    await BiometricAuth.authenticate({ reason: 'Confirm to enable App Lock' });
                } catch (authError) {
                    console.error('Authentication failed:', authError);
                    toast.error('Authentication failed or canceled.');
                    return false;
                }
            }
            
            await Preferences.set({ key: 'biometricEnabled', value: String(newState) });
            setBiometricEnabled(newState);
            toast.success(newState ? 'Biometric App Lock enabled 🛡️' : 'Biometric App Lock disabled');
            return true;
        } catch (error) {
            console.error(error);
            toast.error('Failed to configure biometric lock.');
            return false;
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading, updateUser, biometricEnabled, toggleBiometric }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
