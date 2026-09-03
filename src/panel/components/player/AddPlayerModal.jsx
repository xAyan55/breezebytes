import { useState } from 'react';
import PropTypes from 'prop-types';
import BreezeModal from '../../../components/ui/BreezeModal.jsx';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezeIcon from '../../../components/ui/BreezeIcon.jsx';
import {
  UserCheck,
  ShieldCheck,
  Ban,
  UserPlus,
  AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';

const AddPlayerModal = ({
  isOpen,
  onClose,
  onAddPlayer,
  loading = false,
}) => {
  const [tab, setTab] = useState('whitelist'); // 'whitelist' | 'op' | 'ban'
  const [username, setUsername] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanUser = username.trim();
    if (!cleanUser) {
      setError('Please enter a valid Minecraft username.');
      return;
    }
    if (!/^[A-Za-z0-9_]{1,16}$/.test(cleanUser)) {
      setError('Username must be 1–16 characters (letters, numbers, underscore).');
      return;
    }

    setError(null);
    try {
      await onAddPlayer(tab, cleanUser, reason.trim());
      setUsername('');
      setReason('');
      onClose();
    } catch (err) {
      setError(err.message || 'Action failed');
    }
  };

  return (
    <BreezeModal open={isOpen} isOpen={isOpen} onClose={onClose} title="Add & Manage Player" size="md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Tab switchers */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-s1 rounded-xl border border-s3 text-xs">
          <button
            type="button"
            onClick={() => { setTab('whitelist'); setError(null); }}
            className={clsx(
              'flex items-center justify-center gap-1.5 py-2 rounded-lg font-semibold transition-colors',
              tab === 'whitelist' ? 'bg-s4/30 text-p1' : 'text-p5 hover:text-p4'
            )}
          >
            <BreezeIcon icon={UserCheck} size={15} />
            <span>Whitelist</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab('op'); setError(null); }}
            className={clsx(
              'flex items-center justify-center gap-1.5 py-2 rounded-lg font-semibold transition-colors',
              tab === 'op' ? 'bg-s4/30 text-p1' : 'text-p5 hover:text-p4'
            )}
          >
            <BreezeIcon icon={ShieldCheck} size={15} />
            <span>Operator</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab('ban'); setError(null); }}
            className={clsx(
              'flex items-center justify-center gap-1.5 py-2 rounded-lg font-semibold transition-colors',
              tab === 'ban' ? 'bg-red-500/20 text-red-400' : 'text-p5 hover:text-p4'
            )}
          >
            <BreezeIcon icon={Ban} size={15} />
            <span>Ban</span>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center gap-2 text-xs text-red-400">
            <BreezeIcon icon={AlertCircle} size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Username input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-p4">Minecraft Username *</label>
          <input
            type="text"
            required
            maxLength={16}
            placeholder="e.g. Steve"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (error) setError(null);
            }}
            className="w-full bg-s1 border-2 border-s3 rounded-xl px-3.5 py-2 text-xs text-p4 focus:outline-none focus:border-s4 transition-colors font-mono"
          />
        </div>

        {/* Optional Ban reason */}
        {tab === 'ban' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-p4">Ban Reason (Optional)</label>
            <input
              type="text"
              maxLength={100}
              placeholder="Banned by operator"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-s1 border-2 border-s3 rounded-xl px-3.5 py-2 text-xs text-p4 focus:outline-none focus:border-s4 transition-colors"
            />
          </div>
        )}

        {/* Description info */}
        <p className="text-[11px] text-p5/70 leading-relaxed">
          {tab === 'whitelist' && 'Allows this player to join when whitelist enforcement is active. Works both online and offline.'}
          {tab === 'op' && 'Grants full Level 4 in-game operator permissions. Works both online and offline.'}
          {tab === 'ban' && 'Permanently denies connection to the server. If currently online, they will be disconnected immediately.'}
        </p>

        {/* Actions */}
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
            variant={tab === 'ban' ? 'danger' : 'primary'}
            size="sm"
            icon={UserPlus}
            loading={loading}
          >
            {tab === 'whitelist' ? 'Add to Whitelist' : tab === 'op' ? 'Grant Operator' : 'Ban Player'}
          </BreezeButton>
        </div>
      </form>
    </BreezeModal>
  );
};

AddPlayerModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onAddPlayer: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default AddPlayerModal;
