import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';
import { User, Key, Lock, PlusCircle, Trash2, Copy, Check, Loader2 } from 'lucide-react';

const AccountSettings = () => {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);

  // Password Change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // New API Key Modal
  const [keyModal, setKeyModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState(null);
  const [copied, setCopied] = useState(false);

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
    try {
      setPasswordLoading(true);
      await api.post('/auth/change-password', { currentPassword, newPassword });
      alert('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      alert(`Password update failed: ${err.message}`);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/account/api-keys', { name: keyName });
      if (res.success && res.data) {
        setCreatedKey(res.data);
        setKeyName('');
        fetchKeys();
      }
    } catch (err) {
      alert(`API key creation failed: ${err.message}`);
    }
  };

  const handleDeleteKey = async (keyId) => {
    if (!confirm('Revoke this API Key? Any integrations using this token will stop functioning immediately.')) return;
    try {
      await api.delete(`/account/api-keys/${keyId}`);
      fetchKeys();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleCopyKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-p4 tracking-tight">Account & Security</h1>
        <p className="text-xs text-p5 mt-1">Manage credentials, authentication settings, and developer API keys.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Info Card */}
        <div className="p-6 rounded-2xl bg-[#11141e] border border-[#222638] flex flex-col gap-4 shadow-lg">
          <h2 className="text-base font-bold text-p4 flex items-center gap-2">
            <User size={18} className="text-p1" />
            <span>Profile Details</span>
          </h2>

          <div className="flex flex-col gap-3 text-xs">
            <div>
              <p className="text-p5 uppercase">Username</p>
              <p className="text-sm font-bold text-p4 mt-0.5">{user?.username}</p>
            </div>
            <div>
              <p className="text-p5 uppercase">Email Address</p>
              <p className="text-sm font-bold text-p4 mt-0.5">{user?.email}</p>
            </div>
            <div>
              <p className="text-p5 uppercase">Account Role</p>
              <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-p1/20 text-p1 border border-p1/30">
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <form onSubmit={handlePasswordChange} className="p-6 rounded-2xl bg-[#11141e] border border-[#222638] flex flex-col gap-4 shadow-lg">
          <h2 className="text-base font-bold text-p4 flex items-center gap-2">
            <Lock size={18} className="text-emerald-400" />
            <span>Update Password</span>
          </h2>

          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-p5 uppercase mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-[#08090d] border border-[#222638] rounded-xl px-4 py-2 text-xs text-p4 focus:outline-none focus:border-p1"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-p5 uppercase mb-1">New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[#08090d] border border-[#222638] rounded-xl px-4 py-2 text-xs text-p4 focus:outline-none focus:border-p1"
              />
            </div>

            <button
              type="submit"
              disabled={passwordLoading}
              className="mt-2 py-2.5 rounded-xl bg-p1 text-black font-bold text-xs hover:bg-p1/90 transition-all disabled:opacity-50"
            >
              {passwordLoading ? 'Updating Password...' : 'Save New Password'}
            </button>
          </div>
        </form>
      </div>

      {/* API Keys Manager */}
      <div className="p-6 rounded-2xl bg-[#11141e] border border-[#222638] flex flex-col gap-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-p4 flex items-center gap-2">
              <Key size={18} className="text-p1" />
              <span>Developer API Keys</span>
            </h2>
            <p className="text-xs text-p5 mt-1">Manage API tokens for programmatic REST control of your servers.</p>
          </div>

          <button
            onClick={() => {
              setCreatedKey(null);
              setKeyModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-p1 text-black font-bold text-xs hover:bg-p1/90 shadow-md shadow-p1/20 transition-all"
          >
            <PlusCircle size={15} />
            <span>Generate Key</span>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-6 text-p5">
            <Loader2 className="animate-spin text-p1 size-6" />
          </div>
        ) : apiKeys.length === 0 ? (
          <p className="text-xs text-p5 text-center py-4">No API keys generated yet.</p>
        ) : (
          <div className="divide-y divide-[#222638]">
            {apiKeys.map((k) => (
              <div key={k.id} className="py-3 flex items-center justify-between font-mono text-xs">
                <div>
                  <p className="font-bold text-p4 font-sans">{k.name}</p>
                  <p className="text-p5 text-[11px] mt-0.5">Prefix: {k.key_prefix}...</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-p5">
                    {k.last_used_at ? `Last used: ${new Date(k.last_used_at).toLocaleDateString()}` : 'Never used'}
                  </span>
                  <button
                    onClick={() => handleDeleteKey(k.id)}
                    className="p-1.5 rounded-lg text-p5 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Key Modal */}
      {keyModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#11141e] border border-[#222638] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-p4 mb-4">Generate API Key</h3>

            {createdKey ? (
              <div className="flex flex-col gap-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                  Key created! Please copy and store it securely now; it will not be shown again.
                </div>
                <div className="p-3 bg-[#08090d] border border-[#222638] rounded-xl flex items-center justify-between font-mono text-xs text-p1 break-all select-all">
                  <span>{createdKey.token}</span>
                  <button
                    onClick={handleCopyKey}
                    className="p-1.5 rounded-lg hover:bg-s2 text-p5 hover:text-p4 flex-shrink-0 ml-2"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
                <button
                  onClick={() => {
                    setKeyModal(false);
                    setCreatedKey(null);
                  }}
                  className="w-full py-2 rounded-xl bg-p1 text-black font-bold text-xs"
                >
                  Close & Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateKey} className="flex flex-col gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-p5 uppercase mb-1">Key Description / Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Discord Bot, Monitoring Script"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    className="w-full bg-[#08090d] border border-[#222638] rounded-xl px-4 py-2.5 text-xs text-p4 focus:outline-none focus:border-p1"
                  />
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setKeyModal(false)}
                    className="px-4 py-2 rounded-xl text-xs text-p5 hover:text-p4"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-p1 text-black font-bold text-xs hover:bg-p1/90"
                  >
                    Generate Token
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSettings;
