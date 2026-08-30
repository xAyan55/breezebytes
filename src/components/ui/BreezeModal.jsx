import { useEffect } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';

const BreezeModal = ({ open, onClose, title, children, className }) => {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div
        className={clsx(
          'bg-s2 border-2 border-s3 rounded-3xl p-6 max-w-md w-full shadow-500 relative animate-in zoom-in-95 duration-200',
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          {title && (
            <h3 className="text-base font-bold text-p4 truncate">{title}</h3>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-xl text-p5 hover:text-p4 hover:bg-s5/50 transition-colors ml-auto flex-shrink-0"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
};

export default BreezeModal;

