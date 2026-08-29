import clsx from 'clsx';

const BreezeInput = ({
  id,
  name,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  autoComplete,
  required = false,
  disabled = false,
  className,
  inputClassName,
  ...props
}) => {
  return (
    <div className={clsx('w-full flex flex-col gap-1.5', className)}>
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-semibold uppercase tracking-wider text-p4 flex items-center justify-between"
        >
          <span>
            {label} {required && <span className="text-p1">*</span>}
          </span>
        </label>
      )}

      <div
        className={clsx(
          'relative p-0.5 g5 rounded-2xl shadow-500 group transition-all duration-500',
          error && 'border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.25)]',
        )}
      >
        <div className="relative flex items-center min-h-[44px] px-4 g4 rounded-2xl inner-before group-hover:before:opacity-100 focus-within:before:opacity-100 overflow-hidden">
          {type === 'textarea' ? (
            <textarea
              id={id}
              name={name || id}
              placeholder={placeholder}
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              autoComplete={autoComplete}
              required={required}
              disabled={disabled}
              rows={props.rows || 3}
              className={clsx(
                'w-full h-full bg-transparent text-p4 text-sm font-medium placeholder:text-p5/40 outline-none relative z-2 py-3 resize-none',
                disabled && 'opacity-50',
                inputClassName,
              )}
            />
          ) : type === 'select' ? (
            <select
              id={id}
              name={name || id}
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              disabled={disabled}
              required={required}
              className={clsx(
                'w-full h-full bg-transparent text-p4 text-sm font-medium outline-none relative z-2 py-2 cursor-pointer appearance-none',
                disabled && 'opacity-50',
                inputClassName,
              )}
              {...props}
            >
              {props.children}
            </select>
          ) : (
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
              disabled={disabled}
              className={clsx(
                'w-full h-full bg-transparent text-p4 text-sm font-medium placeholder:text-p5/40 outline-none relative z-2',
                disabled && 'opacity-50',
                inputClassName,
              )}
              {...props}
            />
          )}
        </div>

        <span className="glow-before glow-after" />
      </div>

      {error && (
        <p className="text-xs text-red-400/90 font-medium pl-1">{error}</p>
      )}
    </div>
  );
};

export default BreezeInput;
