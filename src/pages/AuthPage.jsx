import { useEffect } from "react";
import { Link } from "react-router-dom";
import AuthBranding from "../components/auth/AuthBranding.jsx";
import AuthForm from "../components/auth/AuthForm.jsx";

const ArrowLeftIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const AuthPage = ({ mode = "login" }) => {
  const isLogin = mode === "login";

  useEffect(() => {
    document.title = isLogin
      ? "Sign In — BreezeBytes"
      : "Create Account — BreezeBytes";
    window.scrollTo(0, 0);
  }, [isLogin]);

  return (
    <div className="min-h-screen w-full bg-s1 flex flex-col lg:flex-row overflow-x-hidden">
      {/* Left Side: Branding / Image Panel (approx. 50% on desktop) */}
      <div className="w-full lg:w-1/2 min-h-[260px] sm:min-h-[340px] lg:min-h-screen relative flex-shrink-0 border-b lg:border-b-0 lg:border-r border-s3/40">
        <AuthBranding />
      </div>

      {/* Right Side: Authentication Workspace */}
      <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-14 relative bg-s1">
        {/* Top Header: Back to Home Navigation */}
        <div className="w-full flex items-center justify-between z-10 mb-6 sm:mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-p5 hover:text-p1 transition-colors duration-200 group px-3 py-1.5 rounded-lg border border-s3/40 bg-s2/50 hover:border-p1/40"
          >
            <span className="transform group-hover:-translate-x-1 transition-transform duration-200">
              <ArrowLeftIcon />
            </span>
            <span>Back to Home</span>
          </Link>

          {/* Quick link to alternate mode */}
          <Link
            to={isLogin ? "/register" : "/login"}
            className="text-xs font-semibold text-p1 hover:underline tracking-wide max-sm:hidden"
          >
            {isLogin ? "Need an account?" : "Already registered?"}
          </Link>
        </div>

        {/* Centered Form Workspace */}
        <div className="flex-1 flex items-center justify-center my-auto py-4">
          <AuthForm mode={mode} />
        </div>

        {/* Bottom Footer Details */}
        <div className="w-full pt-8 text-center text-xs text-p5/60 flex flex-wrap items-center justify-center gap-4">
          <span>© 2026 BreezeBytes. All rights reserved.</span>
          <span className="hidden sm:inline">•</span>
          <span className="hover:text-p5 cursor-pointer transition-colors">
            Terms of Service
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="hover:text-p5 cursor-pointer transition-colors">
            Privacy Policy
          </span>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
