import clsx from "clsx";

const AuthInput = ({
  id,
  name,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  autoComplete,
  required = false,
  icon,
}) => {
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
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            autoComplete={autoComplete}
            required={required}
            className="w-full h-full bg-transparent text-p4 text-sm font-medium placeholder:text-p5/40 outline-none relative z-2"
          />
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

export default AuthInput;
