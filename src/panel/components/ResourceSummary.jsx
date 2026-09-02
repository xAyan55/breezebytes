import BreezeCard from '../../components/ui/BreezeCard.jsx';
import BreezeIcon from '../../components/ui/BreezeIcon.jsx';
import { HardDrive, Cpu, Server, Zap } from 'lucide-react';
import clsx from 'clsx';
import { formatMbToGb } from '../utils/formatters.js';

const ResourceSummary = ({
  resources,
  loading = false,
  title = 'Your Free Resources',
  subtitle = 'Included with your free hosting tier',
  className,
}) => {
  if (loading || !resources) {
    return (
      <BreezeCard className={clsx('p-5', className)}>
        <div className="flex items-center justify-between pb-3 border-b-2 border-s3">
          <div className="flex items-center gap-2">
            <BreezeIcon icon={Zap} size={18} className="text-p1" />
            <h3 className="base-bold text-p4 text-sm font-semibold tracking-wider uppercase">{title}</h3>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-3.5 rounded-2xl bg-s1 border border-s3 animate-pulse h-20" />
          ))}
        </div>
      </BreezeCard>
    );
  }

  const { ram, cpu, disk, servers } = resources;

  const ramUsed = ram?.used ?? 0;
  const ramLimit = ram?.limit ?? 4096;
  const ramPct = Math.min(100, Math.round((ramUsed / (ramLimit || 1)) * 100));

  const cpuUsed = cpu?.used ?? 0;
  const cpuLimit = cpu?.limit ?? 100;
  const cpuPct = Math.min(100, Math.round((cpuUsed / (cpuLimit || 1)) * 100));

  const diskUsed = disk?.used ?? 0;
  const diskLimit = disk?.limit ?? 10240;
  const diskPct = Math.min(100, Math.round((diskUsed / (diskLimit || 1)) * 100));

  const slotsUsed = servers?.used ?? 0;
  const slotsLimit = servers?.limit ?? 1;
  const slotsPct = Math.min(100, Math.round((slotsUsed / (slotsLimit || 1)) * 100));

  const items = [
    {
      label: 'RAM',
      icon: HardDrive,
      usedDisplay: `${ramUsed} MB`,
      limitDisplay: `${ramLimit} MB`,
      friendlyLimit: formatMbToGb(ramLimit),
      percentage: ramPct,
      availableDisplay: `${ram?.available ?? 0} MB`,
    },
    {
      label: 'CPU',
      icon: Cpu,
      usedDisplay: `${cpuUsed}%`,
      limitDisplay: `${cpuLimit}%`,
      friendlyLimit: `${cpuLimit}%`,
      percentage: cpuPct,
      availableDisplay: `${cpu?.available ?? 0}%`,
    },
    {
      label: 'Storage',
      icon: HardDrive,
      usedDisplay: `${diskUsed} MB`,
      limitDisplay: `${diskLimit} MB`,
      friendlyLimit: formatMbToGb(diskLimit),
      percentage: diskPct,
      availableDisplay: `${disk?.available ?? 0} MB`,
    },
    {
      label: 'Server Slots',
      icon: Server,
      usedDisplay: `${slotsUsed}`,
      limitDisplay: `${slotsLimit}`,
      friendlyLimit: `${slotsLimit} Slot`,
      percentage: slotsPct,
      availableDisplay: `${servers?.available ?? 0}`,
    },
  ];

  return (
    <BreezeCard className={clsx('p-5 flex flex-col gap-4', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3 border-b-2 border-s3">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-s1 border border-s3 flex items-center justify-center text-p1">
            <BreezeIcon icon={Zap} size={16} />
          </div>
          <div>
            <h3 className="base-bold text-p4 text-sm font-semibold tracking-wider uppercase">{title}</h3>
            {subtitle && <p className="text-[11px] text-p5 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <div className="text-[11px] font-mono text-p5/80 self-start sm:self-auto px-2.5 py-1 rounded-lg bg-s1 border border-s3">
          Free Tier Active
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="p-3.5 rounded-2xl bg-s1 border border-s3 flex flex-col justify-between gap-2.5 transition-all duration-200 hover:border-s4/40"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-sans font-bold text-p5 uppercase tracking-wider flex items-center gap-1.5">
                <BreezeIcon icon={item.icon} size={14} className="text-p1" />
                <span>{item.label}</span>
              </span>
              <span className="text-[10px] font-mono font-semibold text-p4">
                {item.friendlyLimit}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between font-mono text-xs">
                <span className="font-bold text-p4 text-sm">
                  {item.usedDisplay}
                </span>
                <span className="text-[11px] text-p5">
                  / {item.limitDisplay}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 rounded-full bg-s2 border border-s3/80 overflow-hidden">
                <div
                  className={clsx(
                    'h-full rounded-full transition-all duration-500',
                    item.percentage >= 100
                      ? 'bg-amber-400'
                      : item.percentage > 0
                      ? 'bg-p1'
                      : 'bg-s4/30'
                  )}
                  style={{ width: `${Math.max(item.percentage, 2)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-p5/70 pt-0.5">
                <span>{item.percentage}% used</span>
                <span>{item.availableDisplay} free</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </BreezeCard>
  );
};

export default ResourceSummary;
