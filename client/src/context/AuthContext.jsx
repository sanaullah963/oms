"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authService } from "@/services/authService";
import { TOKEN_STORAGE_KEY } from "@/services/api";
import { connectSocketWithAuth, disconnectSocket } from "@/hooks/useSocket";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadCurrentUser = useCallback(async () => {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await authService.getMe();
      setUser(res.data.user);
      connectSocketWithAuth();
    } catch (err) {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  const login = async (phone, password) => {
    const res = await authService.login(phone, password);
    window.localStorage.setItem(TOKEN_STORAGE_KEY, res.data.token);
    setUser(res.data.user);
    connectSocketWithAuth();
    return res.data.user;
  };

  const signup = async (name, phone, password) => {
    const res = await authService.signup(name, phone, password);
    return res.data;
  };

  const logout = () => {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
    disconnectSocket();
    window.location.href = "/login";
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    login,
    signup,
    logout,
    refreshUser: loadCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}