import { useState } from 'react';
import PropTypes from 'prop-types';
import BreezeModal from '../../../components/ui/BreezeModal.jsx';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezeIcon from '../../../components/ui/BreezeIcon.jsx';
import {
  AlertTriangle,
  UserMinus,
  Ban,
  ShieldOff,
  UserX,
} from 'lucide-react';

const PlayerActionModal = ({
  isOpen,
  onClose,
  actionType, // 'kick' | 'ban' | 'deop' | 'unwhitelist'
  player,
  onConfirm,
  loading = false,
}) => {
  const [reason, setReason] = useState('');

  if (!isOpen || !player) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(player.username, reason.trim());
  };

  const getActionConfig = () => {
    switch (actionType) {
      case 'kick':
        return {
          title: `Kick Player: ${player.username}`,
          icon: UserMinus,
          btnText: 'Kick Player',
          variant: 'danger',
          description: `Are you sure you want to disconnect ${player.username} from the server? They will be able to rejoin immediately.`,
          showReason: true,
          defaultReason: 'Kicked by operator',
        };
      case 'ban':
        return {
          title: `Ban Player: ${player.username}`,
          icon: Ban,
          btnText: 'Ban Player',
          variant: 'danger',
          description: `This will permanently add ${player.username} to banned-players.json and disconnect them if online.`,
          showReason: true,
          defaultReason: 'Banned by operator',
        };
      case 'deop':
        return {
          title: `Revoke Operator Privileges`,
          icon: ShieldOff,
          btnText: 'Revoke Operator',
          variant: 'danger',
          description: `Are you sure you want to remove operator status from ${player.username}? They will lose all in-game administrative commands.`,
          showReason: false,
        };
      case 'unwhitelist':
        return {
          title: `Remove from Whitelist`,
          icon: UserX,
          btnText: 'Remove Player',
          variant: 'danger',
          description: `Are you sure you want to remove ${player.username} from the whitelist? If whitelist enforcement is on, they will not be able to join.`,
          showReason: false,
        };
      default:
        return {
          title: 'Confirm Action',
          icon: AlertTriangle,
          btnText: 'Confirm',
          variant: 'danger',
          description: 'Are you sure you want to proceed with this action?',
          showReason: false,
        };
    }
  };

  const config = getActionConfig();

  return (
    <BreezeModal open={isOpen} isOpen={isOpen} onClose={onClose} title={config.title} size="md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Warning card */}
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 flex items-start gap-3">
          <BreezeIcon icon={config.icon} size={20} className="text-red-400 mt-0.5 flex-shrink-0" />
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-red-300">Caution: Administrative Action</span>
            <p className="text-xs text-p5 leading-relaxed">{config.description}</p>
          </div>
        </div>

        {/* Reason field (for kick / ban) */}
        {config.showReason && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-p4">Reason (Optional)</label>
            <input
              type="text"
              maxLength={100}
              placeholder={config.defaultReason}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-s1 border-2 border-s3 rounded-xl px-3.5 py-2 text-xs text-p4 focus:outline-none focus:border-s4 transition-colors placeholder:text-p5/50"
            />
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-s3/40">
          <BreezeButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </BreezeButton>
          <BreezeButton
            type="submit"
            variant={config.variant}
            size="sm"
            icon={config.icon}
            loading={loading}
          >
            {config.btnText}
          </BreezeButton>
        </div>
      </form>
    </BreezeModal>
  );
};

PlayerActionModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  actionType: PropTypes.oneOf(['kick', 'ban', 'deop', 'unwhitelist']).isRequired,
  player: PropTypes.object,
  onConfirm: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default PlayerActionModal;
