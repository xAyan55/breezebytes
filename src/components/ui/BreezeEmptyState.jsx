import clsx from 'clsx';
import BreezeButton from './BreezeButton.jsx';

const BreezeEmptyState = ({
  icon: Icon,
  image,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}) => {
  const iconSource = image || Icon;

  return (
    <div
      className={clsx(
        'p-12 border-2 border-s3 rounded-3xl bg-s2 text-center flex flex-col items-center justify-center gap-3',
        className,
      )}
    >
      {iconSource && (
        <div className="size-16 rounded-full border-2 border-s2 bg-s1 flex items-center justify-center text-p1 shadow-500 hover:border-s4 transition-all duration-500 mb-2">
          {typeof iconSource === 'string' ? (
            <img
              src={iconSource}
              alt=""
              className="size-11 object-contain z-2"
            />
          ) : (
            (() => {
              const IconComp = iconSource;
              return <IconComp size={26} />;
            })()
          )}
        </div>
      )}
      {title && (
        <h3 className="h6 text-p4">{title}</h3>
      )}
      {description && (
        <p className="body-3 text-p5 max-w-sm">{description}</p>
      )}
      {(actionLabel && (actionHref || onAction)) && (
        <div className="mt-2">
          {actionHref ? (
            <a href={actionHref}>
              <BreezeButton variant="primary" size="md" icon="/images/magictouch.svg">
                {actionLabel}
              </BreezeButton>
            </a>
          ) : (
            <BreezeButton variant="primary" size="md" icon="/images/magictouch.svg" onClick={onAction}>
              {actionLabel}
            </BreezeButton>
          )}
        </div>
      )}
    </div>
  );
};

export default BreezeEmptyState;
