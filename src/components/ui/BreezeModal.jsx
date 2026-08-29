import clsx from 'clsx';

const BreezeModal = ({ open, onClose, title, children, className }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div
        className={clsx(
          'bg-s2 border-2 border-s3 rounded-3xl p-6 max-w-md w-full shadow-500',
          className,
        )}
      >
        {title && (
          <h3 className="text-base font-bold text-p4 mb-4">{title}</h3>
        )}
        {children}
      </div>
    </div>
  );
};

export default BreezeModal;
