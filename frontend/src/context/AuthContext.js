import React, { createContext, useContext, useMemo, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const login = async (email, password, role, schoolCode) => {
    const response = await api.post("/auth/login", { email, password, role, schoolCode });
    const { token: authToken, user: authUser } = response.data;
    localStorage.setItem("token", authToken);
    localStorage.setItem("user", JSON.stringify(authUser));
    setToken(authToken);
    setUser(authUser);
    return authUser;
  };

  const signup = async ({ schoolName, udiseCode, name, email, password }) => {
    const response = await api.post("/auth/signup", {
      schoolName,
      udiseCode,
      name,
      email,
      password,
    });

    // If server requires verification, return that info to the caller
    if (response.data && response.data.requiresVerification) {
      return { requiresVerification: true, email: response.data.email };
    }

    const { token: authToken, user: authUser } = response.data;
    localStorage.setItem("token", authToken);
    localStorage.setItem("user", JSON.stringify(authUser));
    setToken(authToken);
    setUser(authUser);
    return authUser;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({ token, user, login, signup, logout, isAuthenticated: Boolean(token) }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
