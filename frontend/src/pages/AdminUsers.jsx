import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersAPI } from '../api/client';
import InviteUserModal from '../components/InviteUserModal';
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const [tab, setTab] = useState('staff');
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const queryClient = useQueryClient();

  const fetchUsers = () => {
    usersAPI.list({ type: tab, search: query })
      .then((res) => setUsers(res.data.users || []))
      .catch(() => {});
  };

  useEffect(() => {
    fetchUsers();
  }, [tab, query]);

  const inviteMutation = useMutation({
    mutationFn: (data) => usersAPI.invite(data),
    onSuccess: () => {
      toast.success('User invited successfully');
      setShowInviteModal(false);
      fetchUsers(); // Refresh the list
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to invite user');
    },
  });

  const handleInvite = (formData) => {
    inviteMutation.mutate(formData);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold dark:text-slate-100">Users</h1>
        <div className="space-x-2">
          <button className={`btn ${tab==='staff'?'btn-primary':'btn-secondary'}`} onClick={() => setTab('staff')}>Staff</button>
          <button className={`btn ${tab==='guests'?'btn-primary':'btn-secondary'}`} onClick={() => setTab('guests')}>Guests</button>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <input className="input" placeholder="Search name or email" value={query} onChange={(e)=>setQuery(e.target.value)} />
        <button
          onClick={() => setShowInviteModal(true)}
          className="btn btn-primary"
        >
          Invite
        </button>
      </div>
      <div className="mt-6 card">
        <div className="card-body overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Login</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="py-2 pr-4 dark:text-slate-100">{u.name}</td>
                  <td className="py-2 pr-4 dark:text-slate-300">{u.email}</td>
                  <td className="py-2 pr-4 capitalize dark:text-slate-300">{u.role}</td>
                  <td className="py-2 pr-4 dark:text-slate-300">{u.can_login ? 'Enabled' : 'Disabled'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite User Modal */}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInvite}
        loading={inviteMutation.isPending}
      />
    </div>
  );
}


