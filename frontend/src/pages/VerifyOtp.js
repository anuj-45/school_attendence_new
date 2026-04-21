import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import DashboardLayout from "../components/DashboardLayout";

const VerifyOtp = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const email = params.get("email") || "";
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (!email) return;
    sendOtp();
  }, [email]);

  useEffect(() => {
    let id;
    if (countdown > 0) {
      id = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(id);
  }, [countdown]);

  useEffect(() => {
    let id;
    if (resendCooldown > 0) {
      id = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(id);
  }, [resendCooldown]);

  const sendOtp = async () => {
    try {
      setMessage("");
      setLoading(true);
      await api.post("/auth/send-otp", { email });
      setMessage("OTP sent — check your email");
      setCountdown(3 * 60);
      setResendCooldown(60);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      setMessage("");
      setLoading(true);
      await api.post("/auth/verify-otp", { email, otp });
      setMessage("Verified — redirecting to login...");
      setTimeout(() => navigate("/login"), 1000);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Verify Email">
      <div style={{ maxWidth: 640 }}>
        <p>Enter the 6-digit code sent to <strong>{email}</strong></p>
        <input maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Enter 6-digit code" />
        <div style={{ marginTop: 8 }}>
          <button onClick={handleVerify} disabled={loading || otp.length !== 6}>Verify</button>
          <button onClick={sendOtp} disabled={resendCooldown > 0} style={{ marginLeft: 8 }}>
            {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Resend OTP"}
          </button>
        </div>
        <div style={{ marginTop: 12, color: '#6b7280' }}>
          {countdown > 0 ? `Code expires in ${Math.floor(countdown/60)}:${String(countdown%60).padStart(2,'0')}` : 'Code expired'}
        </div>
        {message && <div style={{ marginTop: 10, color: '#dc2626' }}>{message}</div>}
      </div>
    </DashboardLayout>
  );
};

export default VerifyOtp;
