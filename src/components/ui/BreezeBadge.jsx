import clsx from 'clsx';

const statusStyles = {
  online: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  running: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  starting: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  stopping: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  offline: 'bg-s3/40 text-p5 border-s3',
  crashed: 'bg-red-500/15 text-red-400 border-red-500/30',
  error: 'bg-red-500/15 text-red-400 border-red-500/30',
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  default: 'bg-s4/20 text-p1 border-s4/40',
};

const dotColors = {
  online: 'bg-emerald-400',
  running: 'bg-emerald-400',
  starting: 'bg-amber-400',
  stopping: 'bg-amber-400',
  offline: 'bg-p5/60',
  crashed: 'bg-red-400',
  error: 'bg-red-400',
  active: 'bg-emerald-400',
  default: 'bg-p1',
};

const BreezeBadge = ({
  children,
  status,
  dot = true,
  pulse = false,
  className,
}) => {
  const key = status || 'default';
  const style = statusStyles[key] || statusStyles.default;
  const dotColor = dotColors[key] || dotColors.default;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-20 text-[10px] font-bold uppercase tracking-wider border-2 small-2',
        style,
        className,
      )}
    >
      {dot && (
        <span
          className={clsx(
            'size-2 rounded-full',
            dotColor,
            pulse && 'animate-pulse',
          )}
        />
      )}
      <span>{children}</span>
    </span>
  );
};

export default BreezeBadge;
