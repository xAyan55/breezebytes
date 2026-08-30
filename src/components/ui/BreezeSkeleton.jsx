import clsx from 'clsx';

export const BreezeSkeleton = ({ className, ...props }) => {
  return (
    <div
      className={clsx(
        'animate-pulse bg-s3/40 rounded-2xl',
        className,
      )}
      {...props}
    />
  );
};

export const BreezeCardSkeleton = ({ count = 3, className }) => {
  return (
    <div className={clsx('grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border-2 border-s3 rounded-3xl bg-s2 p-5 flex flex-col justify-between gap-4 h-44 animate-pulse"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-s3/50" />
              <div className="flex flex-col gap-2">
                <div className="h-4 w-32 bg-s3/50 rounded-lg" />
                <div className="h-3 w-24 bg-s3/30 rounded-lg" />
              </div>
            </div>
            <div className="h-6 w-16 bg-s3/50 rounded-full" />
          </div>
          <div className="pt-3 border-t-2 border-s3/60 flex items-center justify-between">
            <div className="h-3 w-16 bg-s3/30 rounded-lg" />
            <div className="h-3 w-16 bg-s3/30 rounded-lg" />
            <div className="h-3 w-16 bg-s3/30 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default BreezeSkeleton;
