import { useState, useCallback } from 'react';
import { auth as authApi } from '../services/api';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('user')) || null; }
        catch { return null; }
    });
    const [token, setToken] = useState(() => localStorage.getItem('token') || null);

    const login = useCallback(async (email, password) => {
        const data = await authApi.login(email, password);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        return data;
    }, []);

    const register = useCallback(async (email, password) => {
        const data = await authApi.register(email, password);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        return data;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
}
