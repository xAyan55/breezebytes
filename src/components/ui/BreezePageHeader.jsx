import clsx from 'clsx';
import BreezeIcon from './BreezeIcon.jsx';

const BreezePageHeader = ({
  caption,
  title,
  description,
  icon: Icon,
  children,
  className,
}) => {
  return (
    <div
      className={clsx(
        'flex flex-col sm:flex-row sm:items-center justify-between gap-4',
        className,
      )}
    >
      <div>
        {caption && (
          <p className="caption">{caption}</p>
        )}
        <h1 className="h6 text-p4 flex items-center gap-2.5">
          {Icon && <BreezeIcon icon={Icon} size={24} className="text-p1" />}
          <span>{title}</span>
        </h1>
        {description && (
          <p className="body-3 text-p5 mt-1">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-3">
          {children}
        </div>
      )}
    </div>
  );
};

export default BreezePageHeader;
