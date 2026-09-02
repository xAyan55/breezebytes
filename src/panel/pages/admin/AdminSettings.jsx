import { useState, useEffect } from 'react';
import api from '../../services/api.js';
import BreezeCard from '../../../components/ui/BreezeCard.jsx';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezeInput from '../../../components/ui/BreezeInput.jsx';
import BreezePageHeader from '../../../components/ui/BreezePageHeader.jsx';
import BreezeIcon from '../../../components/ui/BreezeIcon.jsx';
import BreezeBadge from '../../../components/ui/BreezeBadge.jsx';
import {
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Key,
  Server,
  HelpCircle,
  Loader2,
  Lock,
  Zap,
} from 'lucide-react';
import clsx from 'clsx';

const AdminSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Form state
  const [enabled, setEnabled] = useState(false);
  const [providerPreset, setProviderPreset] = useState('google');
  const [host, setHost] = useState('smtp.gmail.com');
  const [port, setPort] = useState(465);
  const [security, setSecurity] = useState('ssl');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('BreezeBytes');
  const [replyTo, setReplyTo] = useState('');
  const [passwordConfigured, setPasswordConfigured] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  // Test email state
  const [testEmail, setTestEmail] = useState('');
  const [testStatus, setTestStatus] = useState(null); // { type: 'success' | 'error', message: '' }
  const [saveStatus, setSaveStatus] = useState(null); // { type: 'success' | 'error', message: '' }

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/settings/smtp');
      if (res.success && res.data) {
        const d = res.data;
        setEnabled(Boolean(d.enabled));
        setHost(d.host || 'smtp.gmail.com');
        setPort(d.port || 465);
        setSecurity(d.security || 'ssl');
        setUsername(d.username || '');
        setFromEmail(d.fromEmail || '');
        setFromName(d.fromName || 'BreezeBytes');
        setReplyTo(d.replyTo || '');
        setPasswordConfigured(Boolean(d.passwordConfigured));
        setIsConfigured(Boolean(d.configured));

        if (d.host?.includes('gmail') || d.host?.includes('google')) {
          setProviderPreset('google');
        } else {
          setProviderPreset('custom');
        }
      }
    } catch (err) {
      console.error('Failed to load SMTP settings:', err);
      setSaveStatus({ type: 'error', message: err.message || 'Failed to fetch settings.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleProviderChange = (preset) => {
    setProviderPreset(preset);
    if (preset === 'google') {
      setHost('smtp.gmail.com');
      setPort(465);
      setSecurity('ssl');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveStatus(null);
    setTestStatus(null);
    setSaving(true);

    try {
      const payload = {
        enabled,
        host,
        port: Number(port),
        security,
        username,
        fromEmail,
        fromName,
        replyTo,
      };

      if (password && password.trim()) {
        payload.password = password.trim();
      }

      const res = await api.post('/admin/settings/smtp', payload);
      if (res.success) {
        setPassword('');
        setPasswordConfigured(Boolean(res.data.passwordConfigured));
        setIsConfigured(Boolean(res.data.configured));
        setSaveStatus({ type: 'success', message: 'SMTP settings saved and connection pool reloaded.' });
      } else {
        setSaveStatus({ type: 'error', message: res.error?.message || 'Failed to save settings.' });
      }
    } catch (err) {
      setSaveStatus({ type: 'error', message: err.message || 'An error occurred while saving.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      setTestStatus({ type: 'error', message: 'Please enter a valid recipient email address.' });
      return;
    }

    setTestStatus(null);
    setTesting(true);

    try {
      const res = await api.post('/admin/settings/smtp/test', { destinationEmail: testEmail });
      if (res.success) {
        setTestStatus({ type: 'success', message: res.message || 'Test email delivered successfully!' });
      } else {
        setTestStatus({ type: 'error', message: res.error?.message || 'SMTP test failed.' });
      }
    } catch (err) {
      setTestStatus({ type: 'error', message: err.message || 'Failed to send test email.' });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-p5">
        <Loader2 className="size-8 animate-spin text-p1" />
        <p className="body-3 font-medium">Loading SMTP configuration...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      <BreezePageHeader
        caption="Administration"
        title="Email Delivery & SMTP Settings"
        description="Configure Google SMTP or custom mail servers for account verification and password recovery."
        icon={Mail}
      />

      {/* Top Status Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <BreezeCard className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={clsx(
              'size-10 rounded-xl flex items-center justify-center border',
              enabled ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-s2 border-s3 text-p5'
            )}>
              <BreezeIcon icon={Zap} size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-p5 font-medium">System Status</span>
              <span className="text-sm font-bold text-p4">
                {enabled ? 'Delivery Enabled' : 'Delivery Disabled'}
              </span>
            </div>
          </div>
          <BreezeBadge variant={enabled ? 'success' : 'neutral'}>
            {enabled ? 'Active' : 'Off'}
          </BreezeBadge>
        </BreezeCard>

        <BreezeCard className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={clsx(
              'size-10 rounded-xl flex items-center justify-center border',
              isConfigured ? 'bg-p1/10 border-p1/30 text-p1' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            )}>
              <BreezeIcon icon={Server} size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-p5 font-medium">Configuration</span>
              <span className="text-sm font-bold text-p4">
                {isConfigured ? 'Configured' : 'Missing Info'}
              </span>
            </div>
          </div>
          <BreezeBadge variant={isConfigured ? 'primary' : 'warning'}>
            {isConfigured ? 'Ready' : 'Pending'}
          </BreezeBadge>
        </BreezeCard>

        <BreezeCard className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={clsx(
              'size-10 rounded-xl flex items-center justify-center border',
              passwordConfigured ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-s2 border-s3 text-p5'
            )}>
              <BreezeIcon icon={Lock} size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-p5 font-medium">Credentials</span>
              <span className="text-sm font-bold text-p4">
                {passwordConfigured ? 'Encrypted & Stored' : 'Not Set'}
              </span>
            </div>
          </div>
          <BreezeBadge variant={passwordConfigured ? 'success' : 'neutral'}>
            {passwordConfigured ? 'Saved' : 'Empty'}
          </BreezeBadge>
        </BreezeCard>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="flex flex-col gap-6">
        <BreezeCard className="p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between pb-4 border-b border-s3">
            <div className="flex items-center gap-2.5">
              <BreezeIcon icon={Mail} size={20} className="text-p1" />
              <div>
                <h2 className="text-base font-bold text-p4">SMTP Server Configuration</h2>
                <p className="text-xs text-p5">Outbound mail server used to dispatch automated notifications.</p>
              </div>
            </div>

            {/* Toggle Enable Switch */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <span className="text-xs font-semibold text-p4">Enable Email Delivery</span>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-s3 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-p1"></div>
            </label>
          </div>

          {/* Provider Preset Buttons */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-p4">Provider Preset</label>
            <div className="grid grid-cols-2 gap-3 sm:w-80">
              <button
                type="button"
                onClick={() => handleProviderChange('google')}
                className={clsx(
                  'p-3 rounded-xl border text-xs font-medium transition-all text-center flex items-center justify-center gap-2 cursor-pointer',
                  providerPreset === 'google'
                    ? 'bg-s4/20 border-s4 text-p1 font-bold'
                    : 'bg-s1 border-s3 text-p5 hover:border-s4/40 hover:text-p4'
                )}
              >
                <span>Google SMTP (Gmail)</span>
              </button>
              <button
                type="button"
                onClick={() => handleProviderChange('custom')}
                className={clsx(
                  'p-3 rounded-xl border text-xs font-medium transition-all text-center flex items-center justify-center gap-2 cursor-pointer',
                  providerPreset === 'custom'
                    ? 'bg-s4/20 border-s4 text-p1 font-bold'
                    : 'bg-s1 border-s3 text-p5 hover:border-s4/40 hover:text-p4'
                )}
              >
                <span>Custom SMTP</span>
              </button>
            </div>
          </div>

          {/* Connection Host, Port, Security */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <BreezeInput
              label="SMTP Host"
              placeholder="smtp.gmail.com"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              required
            />

            <BreezeInput
              label="SMTP Port"
              type="number"
              placeholder="465"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              required
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-p4">Encryption Security</label>
              <select
                value={security}
                onChange={(e) => setSecurity(e.target.value)}
                className="bg-s1 border-2 border-s3 rounded-2xl px-4 py-3 text-xs text-p4 focus:outline-none focus:border-s4 transition-colors font-mono cursor-pointer"
              >
                <option value="ssl">SSL/TLS (Port 465)</option>
                <option value="starttls">STARTTLS (Port 587)</option>
                <option value="none">None (Plaintext / Port 25)</option>
              </select>
            </div>
          </div>

          {/* Authentication Credentials */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <BreezeInput
              label="SMTP Username / Email"
              type="email"
              placeholder="youraccount@gmail.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-p4">SMTP Password / App Password</label>
                {passwordConfigured && (
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <ShieldCheck size={12} /> Saved
                  </span>
                )}
              </div>
              <input
                type="password"
                placeholder={passwordConfigured ? '•••••••••••••••• (Leave blank to keep current)' : 'Enter 16-char App Password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-s1 border-2 border-s3 rounded-2xl px-4 py-3 text-xs text-p4 focus:outline-none focus:border-s4 transition-colors font-mono"
              />
              <span className="text-[11px] text-p5/80">
                {providerPreset === 'google'
                  ? 'For Google accounts, use a 16-character Google App Password (not your personal password).'
                  : 'Your SMTP account authentication secret. Never shown after saving.'}
              </span>
            </div>
          </div>

          {/* Sender Identity Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <BreezeInput
              label="From Email Address"
              type="email"
              placeholder="no-reply@breezebytes.bond"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              required
            />

            <BreezeInput
              label="From Sender Name"
              placeholder="BreezeBytes"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              required
            />

            <BreezeInput
              label="Reply-To (Optional)"
              type="email"
              placeholder="support@breezebytes.bond"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
            />
          </div>

          {/* Save Status Alert */}
          {saveStatus && (
            <div className={clsx(
              'p-4 rounded-2xl border flex items-center gap-3 text-xs',
              saveStatus.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            )}>
              <BreezeIcon
                icon={saveStatus.type === 'success' ? CheckCircle2 : AlertCircle}
                size={18}
                className={saveStatus.type === 'success' ? 'text-emerald-400' : 'text-red-400'}
              />
              <span>{saveStatus.message}</span>
            </div>
          )}

          {/* Submit Action */}
          <div className="flex justify-end pt-2">
            <BreezeButton
              type="submit"
              variant="primary"
              size="md"
              loading={saving}
              icon={saving ? Loader2 : Key}
            >
              {saving ? 'Saving Settings...' : 'Save SMTP Settings'}
            </BreezeButton>
          </div>
        </BreezeCard>
      </form>

      {/* Test Email Section */}
      <BreezeCard className="p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-s3">
          <BreezeIcon icon={Send} size={18} className="text-p1" />
          <div>
            <h3 className="text-sm font-bold text-p4">Test SMTP Delivery</h3>
            <p className="text-xs text-p5">Send a verified test email to verify credentials and TLS connectivity.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="email"
              placeholder="admin@example.com (Recipient address)"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="w-full bg-s1 border-2 border-s3 rounded-2xl px-4 py-3 text-xs text-p4 focus:outline-none focus:border-s4 transition-colors font-mono"
            />
          </div>
          <BreezeButton
            type="button"
            variant="secondary"
            size="md"
            onClick={handleTestEmail}
            loading={testing}
            disabled={testing || !passwordConfigured}
            icon={testing ? Loader2 : Send}
          >
            {testing ? 'Testing...' : 'Send Test Email'}
          </BreezeButton>
        </div>

        {!passwordConfigured && (
          <p className="text-[11px] text-amber-400 flex items-center gap-1.5">
            <BreezeIcon icon={AlertCircle} size={14} />
            Please configure and save your SMTP credentials above before testing.
          </p>
        )}

        {testStatus && (
          <div className={clsx(
            'p-4 rounded-2xl border flex items-start gap-3 text-xs',
            testStatus.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          )}>
            <BreezeIcon
              icon={testStatus.type === 'success' ? CheckCircle2 : ShieldAlert}
              size={18}
              className={clsx('flex-shrink-0 mt-0.5', testStatus.type === 'success' ? 'text-emerald-400' : 'text-red-400')}
            />
            <div className="flex flex-col gap-0.5">
              <span className="font-bold">
                {testStatus.type === 'success' ? 'Delivery Successful' : 'SMTP Connection Failed'}
              </span>
              <span>{testStatus.message}</span>
            </div>
          </div>
        )}
      </BreezeCard>

      {/* Google Workspace & Gmail Setup Guide */}
      <BreezeCard className="p-6 flex flex-col gap-3 bg-s1/60 border-s3/80">
        <div className="flex items-center gap-2 text-p1 text-xs font-bold uppercase tracking-wider">
          <BreezeIcon icon={HelpCircle} size={16} />
          <span>How to Generate a Google App Password</span>
        </div>
        <p className="text-xs text-p5 leading-relaxed">
          Google accounts with 2-Step Verification do not allow standard passwords for third-party SMTP applications. You must generate an App Password:
        </p>
        <ol className="text-xs text-p5/90 space-y-1.5 list-decimal list-inside pl-1 leading-relaxed">
          <li>Sign into your Google Account and navigate to <strong>Security &rarr; 2-Step Verification</strong>.</li>
          <li>Scroll to the bottom of the page and select <strong>App passwords</strong>.</li>
          <li>Enter <strong className="text-p4">BreezeBytes</strong> as the application name and click <strong>Create</strong>.</li>
          <li>Copy the generated 16-character password and paste it into the <strong>SMTP Password</strong> field above.</li>
        </ol>
      </BreezeCard>
    </div>
  );
};

export default AdminSettings;
