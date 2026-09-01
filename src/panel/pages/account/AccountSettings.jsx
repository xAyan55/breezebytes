import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';
import BreezeCard from '../../../components/ui/BreezeCard.jsx';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezeModal from '../../../components/ui/BreezeModal.jsx';
import BreezeInput from '../../../components/ui/BreezeInput.jsx';
import BreezePageHeader from '../../../components/ui/BreezePageHeader.jsx';
import BreezeBadge from '../../../components/ui/BreezeBadge.jsx';
import BreezeIcon from '../../../components/ui/BreezeIcon.jsx';

const AccountSettings = () => {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [keyModal, setKeyModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const showNotification = (type, message) => {
    setStatusMessage({ type, message });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const fetchKeys = async () => {
    try {
      setLoading(true);
      const res = await api.get('/account/api-keys');
      if (res.success) {
        setApiKeys(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load API keys:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;

    try {
      setPasswordLoading(true);
      const res = await api.put('/account/password', {
        currentPassword,
        newPassword,
      });

      if (res.success) {
        showNotification('success', 'Password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
      } else {
        throw new Error(res.error?.message || 'Password update failed');
      }
    } catch (err) {
      showNotification('error', err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    if (!keyName.trim()) return;

    try {
      const res = await api.post('/account/api-keys', {
        name: keyName.trim(),
      });

      if (res.success && res.data) {
        setCreatedKey(res.data);
        setKeyName('');
        fetchKeys();
      } else {
        throw new Error(res.error?.message || 'Failed to generate API key');
      }
    } catch (err) {
      showNotification('error', err.message);
    }
  };

  const handleDeleteKey = async (keyId) => {
    try {
      const res = await api.delete(`/account/api-keys/${keyId}`);
      if (res.success) {
        showNotification('success', 'API key revoked.');
        fetchKeys();
      } else {
        throw new Error(res.error?.message || 'Failed to revoke key');
      }
    } catch (err) {
      showNotification('error', err.message);
    }
  };

  const copyKey = () => {
    if (createdKey?.token) {
      navigator.clipboard.writeText(createdKey.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <BreezePageHeader
        caption="Security & Identity"
        title="Account Settings"
        description="Manage your credentials, authentication preferences, and developer API keys."
        icon="User"
      />

      {/* Notification Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border-2 flex items-center justify-between text-xs transition-all duration-300 ${
            statusMessage.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}
        >
          <div className="flex items-center gap-2">
            <BreezeIcon icon={statusMessage.type === 'error' ? 'AlertCircle' : 'Check'} size={16} />
            <span>{statusMessage.message}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="font-bold ml-3 text-p4 hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* Profile Overview */}
      <BreezeCard className="p-6">
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-2xl bg-s1 border-2 border-s3 flex items-center justify-center text-p1 font-bold text-2xl uppercase shadow-inner">
            {user?.username ? user.username.charAt(0) : <BreezeIcon icon="User" size={28} />}
          </div>
          <div>
            <h2 className="h6 text-p4 flex items-center gap-2">
              <span>{user?.username}</span>
              <BreezeBadge status={user?.role === 'admin' ? 'running' : 'offline'}>
                {user?.role || 'user'}
              </BreezeBadge>
            </h2>
            <p className="body-3 text-p5 mt-0.5">{user?.email}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-p5">
              <span className="flex items-center gap-1.5">
                <BreezeIcon icon="Shield" size={16} className="text-p1" />
                <span>Standard Authentication</span>
              </span>
            </div>
          </div>
        </div>
      </BreezeCard>

      {/* Password Change */}
      <BreezeCard className="p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <BreezeIcon icon="Lock" size={20} className="text-p1" />
          <h2 className="base-bold text-p4 text-sm font-semibold uppercase tracking-wider">Security & Password</h2>
        </div>
        <form onSubmit={handlePasswordChange} className="flex flex-col gap-4">
          <BreezeInput
            type="password"
            label="Current Password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          <BreezeInput
            type="password"
            label="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          <div className="flex justify-end pt-2">
            <BreezeButton
              type="submit"
              variant="primary"
              size="md"
              loading={passwordLoading}
              disabled={!currentPassword || !newPassword}
            >
              Update Password
            </BreezeButton>
          </div>
        </form>
      </BreezeCard>

      {/* API Keys */}
      <BreezeCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <BreezeIcon icon="Key" size={20} className="text-p1" />
            <div>
              <h2 className="base-bold text-p4 text-sm font-semibold uppercase tracking-wider">Developer API Keys</h2>
              <p className="body-3 text-p5">Generate bearer tokens to programmatically manage your servers.</p>
            </div>
          </div>
          <BreezeButton
            variant="secondary"
            size="sm"
            icon="PlusCircle"
            onClick={() => {
              setCreatedKey(null);
              setKeyModal(true);
            }}
          >
            Generate Key
          </BreezeButton>
        </div>

        {loading ? (
          <div className="py-8 text-center text-p5 text-xs">Loading API credentials...</div>
        ) : apiKeys.length === 0 ? (
          <div className="py-8 text-center text-p5 text-xs">No active API keys found.</div>
        ) : (
          <div className="divide-y divide-s3">
            {apiKeys.map((k) => (
              <div key={k.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-p4">{k.name}</p>
                  <p className="text-xs text-p5 font-mono">
                    Key: ****{k.id.slice(-6)} • Created: {new Date(k.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteKey(k.id)}
                  className="p-2 text-p5 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                  title="Revoke Key"
                >
                  <BreezeIcon icon="Trash2" size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </BreezeCard>

      {/* Create Key Modal */}
      <BreezeModal
        open={keyModal}
        onClose={() => setKeyModal(false)}
        title={createdKey ? 'API Key Created' : 'Generate API Key'}
      >
        {createdKey ? (
          <div className="flex flex-col gap-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs">
              ⚠️ Save this token now! You will not be able to view it again.
            </div>
            <div className="p-3 bg-s1 rounded-xl border border-s3 flex items-center justify-between gap-2 font-mono text-xs text-p4 select-all">
              <span className="truncate">{createdKey.token}</span>
              <button
                onClick={copyKey}
                className="p-1.5 rounded-lg bg-s2 border border-s3 hover:text-p1 transition-colors flex-shrink-0 cursor-pointer"
              >
                {copied ? <BreezeIcon icon="Check" size={14} className="text-emerald-400" /> : <BreezeIcon icon="Copy" size={14} />}
              </button>
            </div>
            <div className="flex justify-end pt-2">
              <BreezeButton variant="primary" size="sm" onClick={() => setKeyModal(false)}>
                Done
              </BreezeButton>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateKey} className="flex flex-col gap-4">
            <BreezeInput
              label="Key Description"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="e.g. Discord Bot, Automated Backups"
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <BreezeButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setKeyModal(false)}
              >
                Cancel
              </BreezeButton>
              <BreezeButton type="submit" variant="primary" size="sm" disabled={!keyName.trim()}>
                Create
              </BreezeButton>
            </div>
          </form>
        )}
      </BreezeModal>
    </div>
  );
};

export default AccountSettings;
