import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../panel/context/AuthContext.jsx";
import api from "../../panel/services/api.js";
import AuthInput from "./AuthInput.jsx";
import PasswordInput from "./PasswordInput.jsx";
import Button from "../Button.jsx";

const AuthForm = ({ mode = "login" }) => {
  const isLogin = mode === "login";
  const isRegister = mode === "register";
  const isForgotPassword = mode === "forgot-password";
  const isResetPassword = mode === "reset-password";
  const isVerifyEmail = mode === "verify-email";

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryToken = searchParams.get("token") || "";
  const queryEmail = searchParams.get("email") || "";

  const { login, register, verifyEmail } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    email: queryEmail,
    password: "",
    confirmPassword: "",
    code: "",
    rememberMe: false,
  });

  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Resend cooldown timer
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (queryEmail) {
      setFormData((prev) => (prev.email ? prev : { ...prev, email: queryEmail }));
    }
  }, [queryEmail]);

  const validate = () => {
    const newErrors = {};

    if (isVerifyEmail) {
      if (!formData.code.trim()) {
        newErrors.code = "Verification code is required";
      } else if (formData.code.trim().length !== 6) {
        newErrors.code = "Code must be exactly 6 digits";
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }

    if (isResetPassword) {
      if (!queryToken) {
        newErrors.password = "Missing reset token from URL";
      }
      if (!formData.password) {
        newErrors.password = "New password is required";
      } else if (formData.password.length < 6) {
        newErrors.password = "Password must be at least 6 characters";
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    if (isForgotPassword) {
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (!isLogin && formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    // Register-specific validation
    if (isRegister) {
      if (!formData.username.trim()) {
        newErrors.username = "Username is required";
      } else if (formData.username.trim().length < 3) {
        newErrors.username = "Username must be at least 3 characters";
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = "Please confirm your password";
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
    if (authError) {
      setAuthError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      setSubmitting(true);
      setAuthError(null);
      setSuccessMessage(null);

      if (isLogin) {
        const authUser = await login(formData.email.trim(), formData.password);
        if (authUser && authUser.onboarding_completed === false) {
          navigate("/panel/onboarding");
        } else {
          navigate("/panel");
        }
      } else if (isRegister) {
        const result = await register(
          formData.email.trim(),
          formData.username.trim(),
          formData.password
        );

        if (result && result.requireVerification) {
          navigate(`/verify-email?email=${encodeURIComponent(result.email || formData.email)}`);
        } else if (result && result.onboarding_completed === false) {
          navigate("/panel/onboarding");
        } else {
          navigate("/panel");
        }
      } else if (isVerifyEmail) {
        const verifiedUser = await verifyEmail(formData.email.trim(), formData.code.trim());
        if (verifiedUser && verifiedUser.onboarding_completed === false) {
          navigate("/panel/onboarding");
        } else {
          navigate("/panel");
        }
      } else if (isForgotPassword) {
        await api.post("/auth/forgot-password", { email: formData.email.trim() });
        setSuccessMessage("If an account exists for that email, a password reset link has been sent.");
      } else if (isResetPassword) {
        const res = await api.post("/auth/reset-password", {
          token: queryToken,
          newPassword: formData.password,
        });
        if (res.success) {
          setSuccessMessage("Password has been reset successfully! You can now sign in with your new password.");
        } else {
          setAuthError(res.error?.message || "Failed to reset password.");
        }
      }
    } catch (err) {
      if (err.requireVerification) {
        navigate(`/verify-email?email=${encodeURIComponent(err.email || formData.email)}`);
      } else {
        setAuthError(err.message || "An error occurred.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || !formData.email) return;
    try {
      setResendCooldown(30);
      await api.post("/auth/resend-verification", { email: formData.email.trim() });
      setSuccessMessage("A new verification code has been sent to your email.");
    } catch {
      setSuccessMessage("If an account exists, a new code has been sent.");
    }
  };

  return (
    <div className="w-full max-w-[440px] mx-auto flex flex-col justify-center">
      {/* BreezeBytes Logo above Form */}
      <div className="flex flex-col items-center text-center mb-8">
        <Link to="/" className="mb-4 inline-block group" aria-label="BreezeBytes Home">
          <img
            src="/images/breeze-logo.png"
            width={48}
            height={48}
            alt="BreezeBytes Logo"
            className="object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-300"
          />
        </Link>

        <h1 className="h4 font-bold text-p4 tracking-tight mb-2">
          {isLogin && "Welcome back"}
          {isRegister && "Create your account"}
          {isForgotPassword && "Reset your password"}
          {isResetPassword && "Set new password"}
          {isVerifyEmail && "Verify your email"}
        </h1>

        <p className="text-sm text-p5">
          {isLogin && "Sign in to manage your Minecraft servers."}
          {isRegister && "Start hosting your Minecraft server with BreezeBytes."}
          {isForgotPassword && "Enter your email address to receive a password recovery link."}
          {isResetPassword && "Choose a secure new password for your account."}
          {isVerifyEmail && `Enter the 6-digit confirmation code sent to ${formData.email || 'your email'}.`}
        </p>
      </div>

      {authError && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/40 text-red-400 text-sm font-medium text-center animate-fadeIn">
          {authError}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-sm font-medium text-center animate-fadeIn">
          {successMessage}
        </div>
      )}

      {/* Form Elements */}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {/* Verification Code Input */}
        {isVerifyEmail && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-p4 text-center">
              6-Digit Verification Code
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={formData.code}
              onChange={(e) => handleChange("code", e.target.value.replace(/\D/g, ""))}
              className="w-full text-center tracking-[0.6em] text-2xl font-mono py-4 rounded-2xl bg-s1 border-2 border-s3 text-p1 focus:border-s4 focus:outline-none transition-colors"
              autoFocus
            />
            {errors.code && (
              <span className="text-xs text-red-400 text-center">{errors.code}</span>
            )}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendCooldown > 0}
                className="text-xs text-p1 hover:underline font-medium disabled:opacity-50 disabled:no-underline cursor-pointer"
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't receive a code? Resend"}
              </button>
            </div>
          </div>
        )}

        {/* Username (Register only) */}
        {isRegister && (
          <AuthInput
            id="username"
            name="username"
            label="Username"
            type="text"
            placeholder="Choose a username"
            value={formData.username}
            onChange={(e) => handleChange("username", e.target.value)}
            error={errors.username}
            autoComplete="username"
            required
            icon="/images/auth-user.svg"
          />
        )}

        {/* Email Input (Login, Register, Forgot Password) */}
        {!isResetPassword && !isVerifyEmail && (
          <AuthInput
            id="email"
            name="email"
            label="Email"
            type="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            error={errors.email}
            autoComplete="email"
            required
            icon="/images/auth-email.svg"
          />
        )}

        {/* Password Input (Login, Register, Reset Password) */}
        {!isForgotPassword && !isVerifyEmail && (
          <PasswordInput
            id="password"
            name="password"
            label={isResetPassword ? "New Password" : "Password"}
            placeholder={isLogin ? "Enter your password" : "Create a password (min 6 chars)"}
            value={formData.password}
            onChange={(e) => handleChange("password", e.target.value)}
            error={errors.password}
            autoComplete={isLogin ? "current-password" : "new-password"}
            required
            icon="/images/auth-password.svg"
          />
        )}

        {/* Confirm Password (Register, Reset Password) */}
        {(isRegister || isResetPassword) && (
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm Password"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={(e) => handleChange("confirmPassword", e.target.value)}
            error={errors.confirmPassword}
            autoComplete="new-password"
            required
            icon="/images/auth-confirm-password.svg"
          />
        )}

        {/* Remember me & Forgot Password links (Login only) */}
        {isLogin && (
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={formData.rememberMe}
                onChange={(e) => handleChange("rememberMe", e.target.checked)}
                className="size-4 rounded bg-s2 border border-s3 text-p1 accent-p1 focus:ring-p1/40 focus:ring-1 cursor-pointer transition-colors"
              />
              <span className="text-xs text-p5 group-hover:text-p4 transition-colors">
                Remember me
              </span>
            </label>

            <Link
              to="/forgot-password"
              className="text-xs text-p1 hover:underline font-medium focus:outline-none transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        )}

        {/* Primary Submit Button */}
        <div className="mt-3 w-full">
          <Button
            containerClassName="w-full"
            icon="/images/magictouch.svg"
            disabled={submitting}
          >
            {submitting
              ? "Please wait..."
              : isLogin
              ? "Sign In"
              : isRegister
              ? "Create Account"
              : isVerifyEmail
              ? "Verify Account"
              : isForgotPassword
              ? "Send Reset Link"
              : "Save New Password"}
          </Button>
        </div>
      </form>

      {/* Switch Mode Footer */}
      <div className="mt-8 pt-6 border-t border-s3/50 text-center">
        <p className="text-sm text-p5">
          {isLogin && (
            <>
              Don&apos;t have an account?{" "}
              <Link to="/register" className="text-p1 font-semibold hover:underline ml-1">
                Create one
              </Link>
            </>
          )}
          {isRegister && (
            <>
              Already have an account?{" "}
              <Link to="/login" className="text-p1 font-semibold hover:underline ml-1">
                Sign in
              </Link>
            </>
          )}
          {(isForgotPassword || isResetPassword || isVerifyEmail) && (
            <>
              Remember your credentials?{" "}
              <Link to="/login" className="text-p1 font-semibold hover:underline ml-1">
                Back to Sign in
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default AuthForm;

