import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';
import BreezeCard from '../../../components/ui/BreezeCard.jsx';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezeModal from '../../../components/ui/BreezeModal.jsx';
import BreezeInput from '../../../components/ui/BreezeInput.jsx';
import BreezePageHeader from '../../../components/ui/BreezePageHeader.jsx';
import BreezeBadge from '../../../components/ui/BreezeBadge.jsx';
import { User, PlusCircle, Trash2, Copy, Check, Loader2 } from 'lucide-react';

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

  const fetchKeys = async () => {
    try {
      setLoading(true);
      const res = await api.get('/account/api-keys');
      if (res.success) setApiKeys(res.data || []);
    } catch (err) { console.error('Failed to load API keys:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchKeys(); }, []);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    try {
      setPasswordLoading(true);
      await api.post('/auth/change-password', { currentPassword, newPassword });
      alert('Password updated successfully!');
      setCurrentPassword(''); setNewPassword('');
    } catch (err) { alert(`Password update failed: ${err.message}`); }
    finally { setPasswordLoading(false); }
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/account/api-keys', { name: keyName });
      if (res.success && res.data) { setCreatedKey(res.data); setKeyName(''); fetchKeys(); }
    } catch (err) { alert(`API key creation failed: ${err.message}`); }
  };

  const handleDeleteKey = async (keyId) => {
    if (!confirm('Revoke this API Key? Any integrations using this token will stop functioning immediately.')) return;
    try { await api.delete(`/account/api-keys/${keyId}`); fetchKeys(); }
    catch (err) { alert(`Delete failed: ${err.message}`); }
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
      <BreezePageHeader
        caption="Account"
        title="Account & Security"
        description="Manage credentials, authentication settings, and developer API keys."
        icon={User}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Info */}
        <BreezeCard className="p-6 flex flex-col gap-4">
          <h2 className="base-bold text-p4 flex items-center gap-2.5">
            <img src="/images/auth-user.svg" alt="" className="size-5 object-contain" />
            <span>Profile Details</span>
          </h2>
          <div className="flex flex-col gap-3">
            <div>
              <p className="small-2 text-p5 uppercase">Username</p>
              <p className="text-sm font-bold text-p4 mt-0.5">{user?.username}</p>
            </div>
            <div>
              <p className="small-2 text-p5 uppercase">Email Address</p>
              <p className="text-sm font-bold text-p4 mt-0.5">{user?.email}</p>
            </div>
            <div>
              <p className="small-2 text-p5 uppercase">Account Role</p>
              <BreezeBadge status="default" dot={false} className="mt-0.5">{user?.role}</BreezeBadge>
            </div>
          </div>
        </BreezeCard>

        {/* Change Password */}
        <form onSubmit={handlePasswordChange}>
          <BreezeCard className="p-6 flex flex-col gap-4 h-full">
            <h2 className="base-bold text-p4 flex items-center gap-2.5">
              <img src="/images/auth-password.svg" alt="" className="size-5 object-contain" />
              <span>Update Password</span>
            </h2>
            <BreezeInput label="Current Password" type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            <BreezeInput label="New Password" type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} min={6} />
            <BreezeButton variant="primary" size="md" type="submit" className="mt-2 w-full" loading={passwordLoading} icon="/images/magictouch.svg">
              {passwordLoading ? 'Updating Password...' : 'Save New Password'}
            </BreezeButton>
          </BreezeCard>
        </form>
      </div>

      {/* API Keys */}
      <BreezeCard className="p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="base-bold text-p4 flex items-center gap-2.5">
              <img src="/images/auth-confirm-password.svg" alt="" className="size-5 object-contain" />
              <span>Developer API Keys</span>
            </h2>
            <p className="small-2 text-p5 mt-1">Manage API tokens for programmatic REST control of your servers.</p>
          </div>
          <BreezeButton variant="primary" size="md" icon={PlusCircle} onClick={() => { setCreatedKey(null); setKeyModal(true); }}>
            Generate Key
          </BreezeButton>
        </div>

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="animate-spin text-p1 size-6" /></div>
        ) : apiKeys.length === 0 ? (
          <p className="small-2 text-p5 text-center py-4">No API keys generated yet.</p>
        ) : (
          <div className="divide-y divide-s3">
            {apiKeys.map((k) => (
              <div key={k.id} className="py-3 flex items-center justify-between font-mono text-xs">
                <div>
                  <p className="base-bold text-p4 font-sans">{k.name}</p>
                  <p className="small-2 text-p5 mt-0.5">Prefix: {k.key_prefix}...</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="small-2 text-p5">{k.last_used_at ? `Last used: ${new Date(k.last_used_at).toLocaleDateString()}` : 'Never used'}</span>
                  <button onClick={() => handleDeleteKey(k.id)} className="p-1.5 rounded-xl text-p5 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-500"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </BreezeCard>

      <BreezeModal open={keyModal} onClose={() => setKeyModal(false)} title="Generate API Key">
        {createdKey ? (
          <div className="flex flex-col gap-4">
            <div className="p-3 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 text-xs">
              Key created! Please copy and store it securely now; it will not be shown again.
            </div>
            <div className="p-3 bg-s1 border-2 border-s3 rounded-2xl flex items-center justify-between font-mono text-xs text-p1 break-all select-all">
              <span>{createdKey.token}</span>
              <button onClick={handleCopyKey} className="p-1.5 rounded-xl hover:bg-s5/40 text-p5 hover:text-p4 flex-shrink-0 ml-2">
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>
            <BreezeButton variant="primary" size="md" className="w-full" onClick={() => { setKeyModal(false); setCreatedKey(null); }}>
              Close & Done
            </BreezeButton>
          </div>
        ) : (
          <form onSubmit={handleCreateKey} className="flex flex-col gap-4">
            <BreezeInput label="Key Description / Name" required placeholder="e.g. Discord Bot, Monitoring Script" value={keyName} onChange={(e) => setKeyName(e.target.value)} />
            <div className="flex justify-end gap-2 mt-2">
              <BreezeButton variant="ghost" size="md" onClick={() => setKeyModal(false)}>Cancel</BreezeButton>
              <BreezeButton variant="primary" size="md" type="submit">Generate Token</BreezeButton>
            </div>
          </form>
        )}
      </BreezeModal>
    </div>
  );
};

export default AccountSettings;
