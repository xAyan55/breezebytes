import { useState } from 'react';
import PropTypes from 'prop-types';
import BreezeModal from '../../../components/ui/BreezeModal.jsx';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezeBadge from '../../../components/ui/BreezeBadge.jsx';
import BreezeIcon from '../../../components/ui/BreezeIcon.jsx';
import McView3DViewer from './McView3DViewer.jsx';
import {
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserMinus,
  Ban,
  ShieldOff,
  UserX,
  Clock,
  Calendar,
} from 'lucide-react';

const PlayerDetailsModal = ({
  isOpen,
  onClose,
  player,
  serverOnline,
  onActionClick, // (actionType, player)
}) => {
  const [copiedUuid, setCopiedUuid] = useState(false);
  const [copiedName, setCopiedName] = useState(false);
  const [animation, setAnimation] = useState('idle');

  if (!isOpen || !player) return null;

  const handleCopyUuid = () => {
    if (player.uuid) {
      navigator.clipboard.writeText(player.uuid);
      setCopiedUuid(true);
      setTimeout(() => setCopiedUuid(false), 2000);
    }
  };

  const handleCopyName = () => {
    navigator.clipboard.writeText(player.username);
    setCopiedName(true);
    setTimeout(() => setCopiedName(false), 2000);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unavailable';
    try {
      return new Date(dateStr).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return 'Unavailable';
    }
  };

  return (
    <BreezeModal isOpen={isOpen} onClose={onClose} title={player.username} size="lg">
      <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 w-full">
        {/* Left Column: McView3D 3D Skin Viewer */}
        <div className="w-full max-w-[340px] flex-shrink-0 flex flex-col items-center">
          <McView3DViewer
            username={player.username}
            animation={animation}
            onAnimationChange={setAnimation}
          />
        </div>

        {/* Right Column: Identity, Status Badges, Timestamps, Actions */}
        <div className="flex flex-col gap-5 w-full min-w-0">
          {/* Header Identity & Quick Copy */}
          <div className="flex flex-col gap-2 p-4 bg-s1 rounded-2xl border border-s3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base font-bold text-p4 font-mono truncate">{player.username}</span>
                <button
                  onClick={handleCopyName}
                  className="p-1 rounded-lg text-p5 hover:text-p4 hover:bg-s2 transition-colors cursor-pointer"
                  title="Copy username"
                >
                  <BreezeIcon icon={copiedName ? Check : Copy} size={14} className={copiedName ? 'text-emerald-400' : ''} />
                </button>
              </div>

              {/* Online/Offline status badge */}
              <BreezeBadge status={player.online ? 'running' : 'offline'} pulse={player.online}>
                {player.online ? 'Online' : 'Offline'}
              </BreezeBadge>
            </div>

            {/* UUID row */}
            <div className="flex items-center justify-between gap-2 text-xs bg-s2/60 p-2 rounded-xl border border-s3/40 font-mono">
              <span className="text-p5/80 text-[11px] truncate select-all">
                {player.uuid || 'UUID not resolved yet'}
              </span>
              {player.uuid && (
                <button
                  onClick={handleCopyUuid}
                  className="flex items-center gap-1 text-[11px] font-semibold text-p1 hover:underline cursor-pointer flex-shrink-0"
                >
                  <BreezeIcon icon={copiedUuid ? Check : Copy} size={12} className={copiedUuid ? 'text-emerald-400' : ''} />
                  <span>{copiedUuid ? 'Copied!' : 'Copy UUID'}</span>
                </button>
              )}
            </div>

            {/* Badges strip */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {player.operator && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  <BreezeIcon icon={ShieldCheck} size={12} />
                  <span>Operator {player.opLevel ? `(Lv ${player.opLevel})` : ''}</span>
                </span>
              )}

              {player.whitelisted && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                  <BreezeIcon icon={UserCheck} size={12} />
                  <span>Whitelisted</span>
                </span>
              )}

              {player.banned && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-500/20 border border-red-500/40 text-red-400">
                  <BreezeIcon icon={ShieldAlert} size={12} />
                  <span>Banned</span>
                </span>
              )}
            </div>
          </div>

          {/* Details & Activity Timestamps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-s1 border border-s3 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-s2 text-p1 flex-shrink-0">
                <BreezeIcon icon={Calendar} size={16} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-p5">First Observed</span>
                <span className="text-xs font-semibold text-p4 truncate">
                  {player.firstSeen ? formatDate(player.firstSeen) : 'Not recorded yet'}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-s1 border border-s3 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-s2 text-p1 flex-shrink-0">
                <BreezeIcon icon={Clock} size={16} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] text-p5">Last Seen</span>
                <span className="text-xs font-semibold text-p4 truncate">
                  {player.online ? 'Active now' : player.lastSeen ? formatDate(player.lastSeen) : 'Unavailable'}
                </span>
              </div>
            </div>
          </div>

          {/* Ban reason if banned */}
          {player.banned && player.banReason && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 flex flex-col gap-1 text-xs">
              <span className="font-semibold text-red-300">Ban Reason:</span>
              <p className="text-p5 text-[11px] italic leading-relaxed">&ldquo;{player.banReason}&rdquo;</p>
            </div>
          )}

          {/* Context-Aware Action Buttons */}
          <div className="flex flex-col gap-2.5 pt-3 border-t border-s3/40">
            <span className="text-xs font-bold text-p4 uppercase tracking-wider text-[10px]">
              Administrative Actions
            </span>

            <div className="grid grid-cols-2 gap-2">
              {/* Op / Deop */}
              {player.operator ? (
                <BreezeButton
                  variant="secondary"
                  size="sm"
                  icon={ShieldOff}
                  onClick={() => onActionClick('deop', player)}
                >
                  Revoke Operator
                </BreezeButton>
              ) : (
                <BreezeButton
                  variant="secondary"
                  size="sm"
                  icon={ShieldCheck}
                  onClick={() => onActionClick('op', player)}
                >
                  Make Operator
                </BreezeButton>
              )}

              {/* Whitelist / Unwhitelist */}
              {player.whitelisted ? (
                <BreezeButton
                  variant="secondary"
                  size="sm"
                  icon={UserX}
                  onClick={() => onActionClick('unwhitelist', player)}
                >
                  Remove Whitelist
                </BreezeButton>
              ) : (
                <BreezeButton
                  variant="secondary"
                  size="sm"
                  icon={UserCheck}
                  onClick={() => onActionClick('whitelist', player)}
                >
                  Add to Whitelist
                </BreezeButton>
              )}
            </div>

            {/* Dangerous actions: Kick & Ban */}
            <div className="grid grid-cols-2 gap-2">
              <BreezeButton
                variant="danger"
                size="sm"
                icon={UserMinus}
                disabled={!player.online || !serverOnline}
                title={!player.online ? 'Player must be online to kick' : !serverOnline ? 'Server must be online' : ''}
                onClick={() => onActionClick('kick', player)}
              >
                Kick Player
              </BreezeButton>

              {player.banned ? (
                <BreezeButton
                  variant="secondary"
                  size="sm"
                  icon={Ban}
                  onClick={() => onActionClick('unban', player)}
                >
                  Pardon (Unban)
                </BreezeButton>
              ) : (
                <BreezeButton
                  variant="danger"
                  size="sm"
                  icon={Ban}
                  onClick={() => onActionClick('ban', player)}
                >
                  Ban Player
                </BreezeButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </BreezeModal>
  );
};

PlayerDetailsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  player: PropTypes.object,
  serverOnline: PropTypes.bool,
  onActionClick: PropTypes.func.isRequired,
};

export default PlayerDetailsModal;
