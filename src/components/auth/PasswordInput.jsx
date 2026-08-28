import { useState } from "react";
import clsx from "clsx";

const EyeIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const PasswordInput = ({
  id,
  name,
  label,
  placeholder = "Enter your password",
  value,
  onChange,
  onBlur,
  error,
  autoComplete = "current-password",
  required = false,
  icon = "/images/auth-password.svg",
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-full flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-wider text-p4 flex items-center justify-between"
      >
        <span>
          {label} {required && <span className="text-p1">*</span>}
        </span>
      </label>

      <div
        className={clsx(
          "relative p-0.5 g5 rounded-2xl shadow-500 group transition-all duration-300",
          error && "border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.25)]",
        )}
      >
        <div className="relative flex items-center min-h-[56px] px-4 g4 rounded-2xl inner-before group-hover:before:opacity-100 focus-within:before:opacity-100 overflow-hidden">
          {icon && (
            <div className="size-9 mr-3.5 flex items-center justify-center flex-shrink-0 z-10 pointer-events-none">
              {typeof icon === "string" ? (
                <img src={icon} alt="" className="size-full object-contain" />
              ) : (
                icon
              )}
            </div>
          )}

          <input
            id={id}
            name={name || id}
            type={showPassword ? "text" : "password"}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            autoComplete={autoComplete}
            required={required}
            className="w-full h-full bg-transparent text-p4 text-sm font-medium placeholder:text-p5/40 outline-none pr-2 relative z-2"
          />

          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="p-1.5 text-p5/60 hover:text-p1 hover:bg-s3/30 rounded-lg transition-all duration-200 focus:outline-none focus:text-p1 flex-shrink-0 relative z-2"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={0}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>

        <span className="glow-before glow-after" />
      </div>

      {error && (
        <p className="text-xs text-red-400/90 font-medium pl-1 animate-fadeIn">
          {error}
        </p>
      )}
    </div>
  );
};

export default PasswordInput;
