import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

const variants = {
  primary:
    'g5 text-p1 font-bold border-2 border-s4/40 shadow-500 hover:border-s4',
  secondary:
    'bg-s1 text-p4 font-semibold border-2 border-s3 hover:border-s4 hover:text-p1',
  outline:
    'bg-transparent text-p5 font-semibold border-2 border-s3 hover:border-s4 hover:text-p4',
  ghost:
    'bg-transparent text-p5 font-medium border-2 border-transparent hover:bg-s2/60 hover:text-p4',
  destructive:
    'bg-red-500/10 text-red-400 font-semibold border-2 border-red-500/30 hover:bg-red-500 hover:text-white',
  success:
    'bg-emerald-500/10 text-emerald-400 font-semibold border-2 border-emerald-500/30 hover:bg-emerald-500 hover:text-black',
  warning:
    'bg-amber-500/10 text-amber-400 font-semibold border-2 border-amber-500/30 hover:bg-amber-500 hover:text-black',
};

const sizes = {
  xs: 'px-2.5 py-1 text-[11px] rounded-xl gap-1.5',
  sm: 'px-3 py-1.5 text-xs rounded-xl gap-1.5',
  md: 'px-4 py-2 text-xs rounded-2xl gap-2',
  lg: 'px-5 py-2.5 text-sm rounded-2xl gap-2',
};

const BreezeButton = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  disabled = false,
  className,
  as: Component = 'button',
  ...props
}) => {
  const isDisabled = disabled || loading;

  const renderIcon = (iconItem, defaultSize = 14) => {
    if (!iconItem) return null;
    if (typeof iconItem === 'string') {
      return (
        <img
          src={iconItem}
          alt=""
          className={clsx(
            'object-contain flex-shrink-0',
            size === 'lg' ? 'size-5' : size === 'xs' ? 'size-3.5' : 'size-4',
          )}
        />
      );
    }
    const IconComp = iconItem;
    return <IconComp size={defaultSize} className="flex-shrink-0" />;
  };

  return (
    <Component
      className={clsx(
        'inline-flex items-center justify-center font-poppins transition-all duration-500 cursor-pointer select-none',
        variants[variant],
        sizes[size],
        isDisabled && 'opacity-40 pointer-events-none',
        className,
      )}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        renderIcon(Icon, 14)
      )}
      {children && <span>{children}</span>}
      {!loading && renderIcon(IconRight, 14)}
    </Component>
  );
};

export default BreezeButton;
