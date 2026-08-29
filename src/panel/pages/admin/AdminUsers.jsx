import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api.js';
import BreezeCard from '../../../components/ui/BreezeCard.jsx';
import BreezeButton from '../../../components/ui/BreezeButton.jsx';
import BreezeModal from '../../../components/ui/BreezeModal.jsx';
import BreezeInput from '../../../components/ui/BreezeInput.jsx';
import BreezePageHeader from '../../../components/ui/BreezePageHeader.jsx';
import BreezeBadge from '../../../components/ui/BreezeBadge.jsx';
import { Users, PlusCircle, Trash2, UserX, UserCheck, Loader2 } from 'lucide-react';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ email: '', username: '', password: '', role: 'user' });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users');
      if (res.success) {
        setUsers(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/users', formData);
      setModalOpen(false);
      setFormData({ email: '', username: '', password: '', role: 'user' });
      fetchUsers();
    } catch (err) {
      alert(`User creation failed: ${err.message}`);
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await api.patch(`/admin/users/${userId}`, { role });
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSuspendToggle = async (user) => {
    try {
      await api.patch(`/admin/users/${user.id}`, { is_suspended: user.is_suspended ? 0 : 1 });
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to permanently delete this user?')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <BreezePageHeader
        caption="Administration"
        title="User Management"
        description="Control user accounts, administrative privileges, and suspensions."
        icon={Users}
      >
        <BreezeButton
          variant="primary"
          size="md"
          icon={PlusCircle}
          onClick={() => setModalOpen(true)}
        >
          New User
        </BreezeButton>
      </BreezePageHeader>

      <BreezeCard className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12 text-p5">
            <Loader2 className="animate-spin text-p1 size-8" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b-2 border-s3 bg-s1 text-p5 font-semibold uppercase tracking-wider small-compact">
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-s3/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-s5/30 transition-colors duration-500">
                    <td className="py-3.5 px-4 font-bold text-p4 flex items-center gap-2">
                      <div className="size-7 rounded-full bg-s4/20 border border-s4/30 flex items-center justify-center text-xs font-bold text-p1">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <span>{u.username}</span>
                    </td>
                    <td className="py-3.5 px-4 text-p5 font-mono">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="bg-s1 border-2 border-s3 rounded-xl px-2.5 py-1 text-xs text-p4 uppercase font-semibold focus:outline-none focus:border-s4 transition-all duration-500"
                      >
                        <option value="user">User</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                        <option value="owner">Owner</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4">
                      <BreezeBadge status={u.is_suspended ? 'crashed' : 'online'}>
                        {u.is_suspended ? 'Suspended' : 'Active'}
                      </BreezeBadge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleSuspendToggle(u)}
                          className="p-1.5 rounded-xl text-p5 hover:text-amber-400 hover:bg-amber-500/10 transition-colors duration-500"
                          title={u.is_suspended ? 'Unsuspend' : 'Suspend'}
                        >
                          {u.is_suspended ? <UserCheck size={16} /> : <UserX size={16} />}
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="p-1.5 rounded-xl text-p5 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-500"
                          title="Delete User"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </BreezeCard>

      {/* New User Modal */}
      <BreezeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create New Account"
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <BreezeInput
            label="Email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <BreezeInput
            label="Username"
            required
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          />
          <BreezeInput
            label="Password"
            type="password"
            required
            minLength={6}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
          <BreezeInput
            label="Role"
            type="select"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          >
            <option value="user">User</option>
            <option value="moderator">Moderator</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
          </BreezeInput>

          <div className="flex justify-end gap-2 mt-2">
            <BreezeButton
              variant="ghost"
              size="md"
              type="button"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </BreezeButton>
            <BreezeButton variant="primary" size="md" type="submit">
              Create User
            </BreezeButton>
          </div>
        </form>
      </BreezeModal>
    </div>
  );
};

export default AdminUsers;
