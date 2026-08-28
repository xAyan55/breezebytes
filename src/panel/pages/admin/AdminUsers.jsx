import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api.js';
import { Users, PlusCircle, Trash2, Shield, UserX, UserCheck, Loader2 } from 'lucide-react';

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
      <div className="p-4 rounded-2xl bg-[#11141e] border border-[#222638] flex items-center justify-between shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-p4">User Management</h1>
          <p className="text-xs text-p5">Control user accounts, administrative privileges, and suspensions.</p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-p1 text-black font-bold text-xs hover:bg-p1/90 shadow-md shadow-p1/20 transition-all"
        >
          <PlusCircle size={15} />
          <span>New User</span>
        </button>
      </div>

      <div className="rounded-2xl bg-[#11141e] border border-[#222638] overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex justify-center py-12 text-p5">
            <Loader2 className="animate-spin text-p1 size-8" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#222638] bg-[#08090d] text-p5 font-semibold uppercase">
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222638]/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-s2/30">
                    <td className="py-3.5 px-4 font-bold text-p4 flex items-center gap-2">
                      <div className="size-7 rounded-full bg-p1/20 flex items-center justify-center text-xs font-bold text-p1">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <span>{u.username}</span>
                    </td>
                    <td className="py-3.5 px-4 text-p5 font-mono">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="bg-[#08090d] border border-[#222638] rounded-lg px-2.5 py-1 text-xs text-p4 uppercase font-semibold focus:outline-none"
                      >
                        <option value="user">User</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                        <option value="owner">Owner</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          u.is_suspended
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {u.is_suspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleSuspendToggle(u)}
                          className="p-1.5 rounded-lg text-p5 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                          title={u.is_suspended ? 'Unsuspend' : 'Suspend'}
                        >
                          {u.is_suspended ? <UserCheck size={16} /> : <UserX size={16} />}
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="p-1.5 rounded-lg text-p5 hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
      </div>

      {/* New User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#11141e] border border-[#222638] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-p4 mb-4">Create New Account</h3>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-p5 uppercase mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-[#08090d] border border-[#222638] rounded-xl px-4 py-2 text-xs text-p4 focus:outline-none focus:border-p1"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-p5 uppercase mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full bg-[#08090d] border border-[#222638] rounded-xl px-4 py-2 text-xs text-p4 focus:outline-none focus:border-p1"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-p5 uppercase mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-[#08090d] border border-[#222638] rounded-xl px-4 py-2 text-xs text-p4 focus:outline-none focus:border-p1"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-p5 uppercase mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-[#08090d] border border-[#222638] rounded-xl px-4 py-2 text-xs text-p4 focus:outline-none focus:border-p1 uppercase font-semibold"
                >
                  <option value="user">User</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-p5 hover:text-p4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-p1 text-black font-bold text-xs hover:bg-p1/90"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
