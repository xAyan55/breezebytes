import clsx from 'clsx';

const BreezeStatCard = ({
  label,
  value,
  subtitle,
  icon,
  image,
  iconClassName,
  className,
}) => {
  const iconSource = image || icon;

  return (
    <div
      className={clsx(
        'p-5 border-2 border-s3 rounded-3xl bg-s2 flex items-center justify-between gap-4',
        className,
      )}
    >
      <div className="min-w-0">
        <p className="small-compact uppercase text-p5 truncate">{label}</p>
        <p className="text-2xl sm:text-3xl font-bold text-p4 mt-1 font-inter tracking-tight truncate">
          {value}
        </p>
        {subtitle && (
          <p className="text-[11px] text-p5 mt-1 truncate">{subtitle}</p>
        )}
      </div>
      {iconSource && (
        <div
          className={clsx(
            'size-14 rounded-full border-2 border-s2 flex items-center justify-center shadow-500 transition-all duration-500 hover:border-s4 flex-shrink-0 bg-s1/60',
            iconClassName || 'text-p1',
          )}
        >
          {typeof iconSource === 'string' ? (
            <img
              src={iconSource}
              alt=""
              className="size-10 object-contain z-2"
            />
          ) : (
            (() => {
              const IconComp = iconSource;
              return <IconComp size={22} />;
            })()
          )}
        </div>
      )}
    </div>
  );
};

export default BreezeStatCard;
