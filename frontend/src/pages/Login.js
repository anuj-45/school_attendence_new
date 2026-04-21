import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { login, signup } = useAuth();
  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState({
    schoolName: "",
    udiseCode: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    signInRole: "admin",
    schoolCode: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      setLoading(true);

      let user;
      if (mode === "signup") {
        if (!form.schoolName || !form.udiseCode || !form.name || !form.email || !form.password || !form.confirmPassword) {
          setError("School name, UDISE code, admin name, email and password are required");
          return;
        }
        if (form.password !== form.confirmPassword) {
          setError("Passwords do not match");
          return;
        }
        user = await signup({
          schoolName: form.schoolName,
          udiseCode: form.udiseCode,
          name: form.name,
          email: form.email,
          password: form.password,
        });
      } else {
        if (!form.email || !form.password) {
          setError("Email and password are required");
          return;
        }
        if ((form.signInRole === "teacher" || form.signInRole === "admin") && !form.schoolCode) {
          setError("School UDISE code is required for sign in");
          return;
        }
        user = await login(form.email, form.password, form.signInRole, form.schoolCode);
      }

      if (user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/teacher");
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="auth-mode-switch">
          <button
            type="button"
            className={`auth-mode-btn ${mode === "signin" ? "active" : ""}`}
            onClick={() => {
              setMode("signin");
              setError("");
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-mode-btn ${mode === "signup" ? "active" : ""}`}
            onClick={() => {
              setMode("signup");
              setError("");
            }}
          >
            Sign Up
          </button>
        </div>

        <h2>{mode === "signup" ? "Create Admin Account" : "Welcome Back"}</h2>
        <p>
          {mode === "signup"
            ? "Sign up first using school code and admin details"
            : "Sign in to continue to School Attendance"}
        </p>
        <form onSubmit={onSubmit}>
          {mode === "signin" && (
            <>
              <label>Sign In As</label>
              <div className="role-switch">
                <button
                  type="button"
                  className={`role-btn ${form.signInRole === "admin" ? "active" : ""}`}
                  onClick={() => setForm((prev) => ({ ...prev, signInRole: "admin" }))}
                >
                  Admin
                </button>
                <button
                  type="button"
                  className={`role-btn ${form.signInRole === "teacher" ? "active" : ""}`}
                  onClick={() => setForm((prev) => ({ ...prev, signInRole: "teacher" }))}
                >
                  Teacher
                </button>
              </div>
            </>
          )}

          {mode === "signup" && (
            <>
              <label>School Name</label>
              <input
                type="text"
                name="schoolName"
                value={form.schoolName}
                onChange={onChange}
                placeholder="Enter school name"
              />
              <label>School UDISE Code</label>
              <input
                type="text"
                name="udiseCode"
                value={form.udiseCode}
                onChange={onChange}
                placeholder="Enter 11-digit UDISE code"
                inputMode="numeric"
                pattern="[0-9]{11}"
                maxLength={11}
              />
              <label>Admin Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={onChange}
                placeholder="Enter admin name"
              />
            </>
          )}

          <label>Email</label>
          <input type="email" name="email" value={form.email} onChange={onChange} placeholder="admin@school.com" />
          {mode === "signin" && (form.signInRole === "teacher" || form.signInRole === "admin") && (
            <>
              <label>School UDISE Code</label>
              <input
                type="text"
                name="schoolCode"
                value={form.schoolCode}
                onChange={onChange}
                placeholder="Enter 11-digit UDISE code"
                inputMode="numeric"
                pattern="[0-9]{11}"
                maxLength={11}
              />
            </>
          )}
          <label>Password</label>
          <input type="password" name="password" value={form.password} onChange={onChange} placeholder="Enter password" />
          {mode === "signup" && (
            <>
              <label>Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={onChange}
                placeholder="Re-enter password"
              />
            </>
          )}
          {error && <div className="error-text">{error}</div>}
          <button type="submit" disabled={loading} style={{ marginTop: 12 }}>
            {loading
              ? mode === "signup"
                ? "Creating account..."
                : "Signing in..."
              : mode === "signup"
                ? "Create Account"
                : "Login"}
          </button>
        </form>
        <footer className="login-footer">
          <p>&copy; 2026 School Attendance Management System. Developed by <strong>Anuj Dafure</strong> |
           All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default Login;
