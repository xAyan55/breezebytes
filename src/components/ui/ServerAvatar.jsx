import { useState } from 'react';
import SoftwareIcon from './SoftwareIcons.jsx';
import clsx from 'clsx';

export const ServerAvatar = ({
  server,
  className = 'size-11',
  iconSize = 22,
  rounded = 'rounded-xl',
}) => {
  const [imgError, setImgError] = useState(false);
  const iconSrc = server?.icon || '/breeze.png';

  if (imgError) {
    return (
      <div className={clsx('flex items-center justify-center bg-s1 border border-s3 flex-shrink-0 p-1.5 shadow-sm', rounded, className)}>
        <SoftwareIcon software={server?.software} size={iconSize} className="text-p1" />
      </div>
    );
  }

  return (
    <div className={clsx('relative flex items-center justify-center bg-s1/90 border border-s3 flex-shrink-0 overflow-hidden shadow-sm', rounded, className)}>
      <img
        src={iconSrc}
        alt={server?.name || 'Server'}
        className="w-full h-full object-cover rounded-[inherit]"
        onError={() => setImgError(true)}
      />
    </div>
  );
};

export default ServerAvatar;
