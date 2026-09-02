import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import BreezeCard from '../../components/ui/BreezeCard.jsx';
import BreezeButton from '../../components/ui/BreezeButton.jsx';
import BreezeIcon from '../../components/ui/BreezeIcon.jsx';
import { formatMbToGb } from '../utils/formatters.js';
import {
  Server,
  HardDrive,
  Cpu,
  Zap,
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles,
  AlertCircle,
  Loader2,
} from 'lucide-react';

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, refetchUser } = useAuth();
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState(null);

  // Redirect users who have already completed onboarding
  useEffect(() => {
    if (user && user.onboarding_completed) {
      navigate('/panel', { replace: true });
    }
  }, [user, navigate]);

  // Extract canonical limits from user account state
  const resources = user?.resources || {};
  const ramMb = resources.ram?.limit ?? user?.hosting_ram ?? 4096;
  const cpuPct = resources.cpu?.limit ?? user?.hosting_cpu ?? 100;
  const diskMb = resources.disk?.limit ?? user?.hosting_disk ?? 10240;
  const slots = resources.servers?.limit ?? user?.hosting_server_slots ?? 1;

  const handleCreateServer = () => {
    navigate('/panel/servers/create');
  };

  const handleSkip = async () => {
    try {
      setSkipping(true);
      setError(null);
      const res = await api.post('/account/onboarding/skip');
      if (res.success) {
        if (refetchUser) {
          await refetchUser();
        }
        navigate('/panel');
      } else {
        throw new Error(res.error?.message || 'Failed to skip onboarding');
      }
    } catch (err) {
      console.error('Failed to skip onboarding:', err);
      setError(err.message || 'Unable to update onboarding state. Please try again.');
    } finally {
      setSkipping(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-6 px-4">
      <div className="w-full max-w-2xl flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300">
        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border-2 border-red-500/30 flex items-center gap-3 text-red-400 text-xs">
            <BreezeIcon icon={AlertCircle} size={18} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Main Onboarding Card */}
        <BreezeCard className="p-6 sm:p-8 flex flex-col gap-6 relative overflow-hidden">
          {/* Subtle accent glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-p1/5 rounded-full blur-3xl pointer-events-none" />

          {/* Header Banner */}
          <div className="flex flex-col items-center text-center gap-3">
            <div className="size-14 rounded-2xl bg-s1 border-2 border-s3 flex items-center justify-center p-3 text-p1 shadow-500">
              <BreezeIcon icon={Sparkles} size={28} />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-p1 uppercase tracking-widest font-mono">
                First-Time Setup
              </span>
              <h1 className="h4 font-bold text-p4 tracking-tight">
                Welcome to BreezeBytes
              </h1>
              <p className="body-2 text-p5 max-w-md mx-auto">
                Your free Minecraft server is ready to be created.
              </p>
            </div>
          </div>

          {/* Unified Resource Summary Card */}
          <div className="flex flex-col gap-3 p-4 sm:p-5 rounded-2xl bg-s1 border-2 border-s3">
            <div className="flex items-center justify-between pb-2.5 border-b border-s3/70">
              <div className="flex items-center gap-2">
                <BreezeIcon icon={Zap} size={16} className="text-p1" />
                <span className="text-xs font-bold text-p4 uppercase tracking-wider">
                  Your Included Free Allocation
                </span>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-s2 text-p1 border border-s3">
                No Expiry • 100% Free
              </span>
            </div>

            {/* 4 Unified Resource Metric Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="p-3 rounded-xl bg-s2 border border-s3 flex flex-col items-center text-center gap-0.5">
                <span className="text-[10px] font-semibold text-p5 uppercase tracking-wider flex items-center gap-1">
                  <BreezeIcon icon={HardDrive} size={12} className="text-p1" />
                  <span>RAM</span>
                </span>
                <span className="text-base font-bold text-p4 font-mono mt-0.5">
                  {formatMbToGb(ramMb)}
                </span>
                <span className="text-[9px] text-p5/60 font-mono">
                  {ramMb} MB DDR4
                </span>
              </div>

              <div className="p-3 rounded-xl bg-s2 border border-s3 flex flex-col items-center text-center gap-0.5">
                <span className="text-[10px] font-semibold text-p5 uppercase tracking-wider flex items-center gap-1">
                  <BreezeIcon icon={Cpu} size={12} className="text-p1" />
                  <span>CPU</span>
                </span>
                <span className="text-base font-bold text-p4 font-mono mt-0.5">
                  {cpuPct}%
                </span>
                <span className="text-[9px] text-p5/60 font-mono">
                  1 Dedicated Core
                </span>
              </div>

              <div className="p-3 rounded-xl bg-s2 border border-s3 flex flex-col items-center text-center gap-0.5">
                <span className="text-[10px] font-semibold text-p5 uppercase tracking-wider flex items-center gap-1">
                  <BreezeIcon icon={HardDrive} size={12} className="text-p1" />
                  <span>Storage</span>
                </span>
                <span className="text-base font-bold text-p4 font-mono mt-0.5">
                  {formatMbToGb(diskMb)}
                </span>
                <span className="text-[9px] text-p5/60 font-mono">
                  NVMe Fast SSD
                </span>
              </div>

              <div className="p-3 rounded-xl bg-s2 border border-s3 flex flex-col items-center text-center gap-0.5">
                <span className="text-[10px] font-semibold text-p5 uppercase tracking-wider flex items-center gap-1">
                  <BreezeIcon icon={Server} size={12} className="text-p1" />
                  <span>Slots</span>
                </span>
                <span className="text-base font-bold text-p4 font-mono mt-0.5">
                  {slots}
                </span>
                <span className="text-[9px] text-p5/60 font-mono">
                  Server Instance
                </span>
              </div>
            </div>
          </div>

          {/* Trust Guarantees */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-p5">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-s1/60 border border-s3/60">
              <BreezeIcon icon={ShieldCheck} size={16} className="text-emerald-400 flex-shrink-0" />
              <span>Resources belong permanently to your account</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-s1/60 border border-s3/60">
              <BreezeIcon icon={Clock} size={16} className="text-p1 flex-shrink-0" />
              <span>Deploy now or return later without losing quota</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t-2 border-s3">
            <button
              type="button"
              onClick={handleSkip}
              disabled={skipping}
              className="text-xs font-semibold text-p5 hover:text-p4 transition-colors order-2 sm:order-1 py-2 px-3 rounded-xl hover:bg-s5/50 cursor-pointer"
            >
              {skipping ? (
                <span className="inline-flex items-center gap-1.5">
                  <BreezeIcon icon={Loader2} size={14} className="animate-spin" />
                  <span>Skipping...</span>
                </span>
              ) : (
                'Skip for Now'
              )}
            </button>

            <BreezeButton
              type="button"
              variant="primary"
              size="md"
              iconRight={ArrowRight}
              onClick={handleCreateServer}
              disabled={skipping}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              Create Your Server
            </BreezeButton>
          </div>
        </BreezeCard>
      </div>
    </div>
  );
};

export default Onboarding;
