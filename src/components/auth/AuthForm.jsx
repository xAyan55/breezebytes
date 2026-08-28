import { useState } from "react";
import { Link } from "react-router-dom";
import AuthInput from "./AuthInput.jsx";
import PasswordInput from "./PasswordInput.jsx";
import Button from "../Button.jsx";

const AuthForm = ({ mode = "login" }) => {
  const isLogin = mode === "login";

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    rememberMe: false,
  });

  const [errors, setErrors] = useState({});
  const [formTouched, setFormTouched] = useState(false);

  const validate = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (!isLogin && formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    // Register-specific validation
    if (!isLogin) {
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
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormTouched(true);

    if (validate()) {
      // Form is valid on client-side and ready for backend authentication connection
      // We do not simulate fake authentication
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
            alt="BreezeBytes"
            className="object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-300"
          />
        </Link>

        <h1 className="h4 font-bold text-p4 tracking-tight mb-2">
          {isLogin ? "Welcome back" : "Create your account"}
        </h1>

        <p className="text-sm text-p5">
          {isLogin
            ? "Sign in to manage your Minecraft servers."
            : "Start hosting your Minecraft server with BreezeBytes."}
        </p>
      </div>

      {/* Form Elements */}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {!isLogin && (
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

        <PasswordInput
          id="password"
          name="password"
          label="Password"
          placeholder={isLogin ? "Enter your password" : "Create a password"}
          value={formData.password}
          onChange={(e) => handleChange("password", e.target.value)}
          error={errors.password}
          autoComplete={isLogin ? "current-password" : "new-password"}
          required
          icon="/images/auth-password.svg"
        />

        {!isLogin && (
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

            <button
              type="button"
              className="text-xs text-p1 hover:underline font-medium focus:outline-none transition-colors"
            >
              Forgot password?
            </button>
          </div>
        )}

        {/* Primary Submit Button */}
        <div className="mt-3 w-full">
          <Button
            containerClassName="w-full"
            icon="/images/magictouch.svg"
          >
            {isLogin ? "Sign In" : "Create Account"}
          </Button>
        </div>
      </form>

      {/* Switch Mode Footer */}
      <div className="mt-8 pt-6 border-t border-s3/50 text-center">
        <p className="text-sm text-p5">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <Link
            to={isLogin ? "/register" : "/login"}
            className="text-p1 font-semibold hover:underline transition-colors ml-1 inline-block"
          >
            {isLogin ? "Create one" : "Sign in"}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AuthForm;
