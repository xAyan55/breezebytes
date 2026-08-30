import clsx from 'clsx';

export const PaperIcon = ({ className, size = 22, ...props }) => (
  <img
    src="/images/icons/PaperIcon.png"
    alt="Paper"
    width={size}
    height={size}
    className={clsx('object-contain flex-shrink-0 select-none inline-block', className)}
    style={{ width: `${size}px`, height: `${size}px` }}
    {...props}
  />
);

export const VanillaIcon = ({ className, size = 22, ...props }) => (
  <img
    src="/images/icons/VanillaIcon.png"
    alt="Vanilla"
    width={size}
    height={size}
    className={clsx('object-contain flex-shrink-0 select-none inline-block', className)}
    style={{ width: `${size}px`, height: `${size}px` }}
    {...props}
  />
);

export const PurpurIcon = ({ className, size = 22, ...props }) => (
  <img
    src="/images/icons/PurpurIcon.png"
    alt="Purpur"
    width={size}
    height={size}
    className={clsx('object-contain flex-shrink-0 select-none inline-block', className)}
    style={{ width: `${size}px`, height: `${size}px` }}
    {...props}
  />
);

export const ForgeIcon = ({ className, size = 22, ...props }) => (
  <img
    src="/images/icons/ForgeIcon.png"
    alt="Forge"
    width={size}
    height={size}
    className={clsx('object-contain flex-shrink-0 select-none inline-block', className)}
    style={{ width: `${size}px`, height: `${size}px` }}
    {...props}
  />
);

export const FabricIcon = ({ className, size = 22, ...props }) => (
  <img
    src="/images/icons/FabricIcon.png"
    alt="Fabric"
    width={size}
    height={size}
    className={clsx('object-contain flex-shrink-0 select-none inline-block', className)}
    style={{ width: `${size}px`, height: `${size}px` }}
    {...props}
  />
);

export const VelocityIcon = ({ className, size = 22, ...props }) => (
  <img
    src="/images/icons/VelocityIcon.png"
    alt="Velocity"
    width={size}
    height={size}
    className={clsx('object-contain flex-shrink-0 select-none inline-block', className)}
    style={{ width: `${size}px`, height: `${size}px` }}
    {...props}
  />
);

export const SoftwareIcon = ({ software, className, size = 22, ...props }) => {
  const sw = (software || 'paper').toLowerCase();
  if (sw === 'vanilla') return <VanillaIcon className={className} size={size} {...props} />;
  if (sw === 'purpur') return <PurpurIcon className={className} size={size} {...props} />;
  if (sw === 'forge') return <ForgeIcon className={className} size={size} {...props} />;
  if (sw === 'fabric') return <FabricIcon className={className} size={size} {...props} />;
  if (sw === 'velocity') return <VelocityIcon className={className} size={size} {...props} />;
  return <PaperIcon className={className} size={size} {...props} />;
};

export default SoftwareIcon;
