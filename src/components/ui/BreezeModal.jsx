import { useEffect } from 'react';
import clsx from 'clsx';
import BreezeIcon from './BreezeIcon.jsx';

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-5xl',
  full: 'max-w-6xl',
};

const BreezeModal = ({ open, isOpen, onClose, title, children, className, size = 'md' }) => {
  const isModalOpen = open !== undefined ? open : isOpen;

  useEffect(() => {
    if (!isModalOpen) return;
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
  }, [isModalOpen, onClose]);

  if (!isModalOpen) return null;

  const maxWidthClass = SIZES[size] || SIZES.md;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div
        className={clsx(
          'bg-s2 border-2 border-s3 rounded-3xl p-6 w-full shadow-500 relative animate-in zoom-in-95 duration-200 my-auto',
          maxWidthClass,
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
              className="p-1 rounded-xl text-p5 hover:text-p4 hover:bg-s5/50 transition-colors ml-auto flex-shrink-0 cursor-pointer"
              aria-label="Close dialog"
            >
              <BreezeIcon name="X" size={18} />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
};

export default BreezeModal;
