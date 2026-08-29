import clsx from 'clsx';

const BreezeCard = ({
  children,
  className,
  gradient = false,
  hover = false,
  as: Component = 'div',
  ...props
}) => {
  return (
    <Component
      className={clsx(
        'border-2 border-s3 rounded-3xl',
        gradient ? 'g7' : 'bg-s2',
        hover && 'transition-all duration-500 hover:border-s4 hover:shadow-500',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
};

export default BreezeCard;
