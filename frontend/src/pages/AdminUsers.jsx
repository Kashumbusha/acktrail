import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersAPI } from '../api/client';
import InviteUserModal from '../components/InviteUserModal';
import EditUserModal from '../components/EditUserModal';
import { PencilIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const [tab, setTab] = useState('staff');
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
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

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => usersAPI.update(id, data),
    onSuccess: () => {
      toast.success('User updated successfully');
      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers(); // Refresh the list
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update user');
    },
  });

  const handleUpdate = (userId, formData) => {
    updateMutation.mutate({ id: userId, data: formData });
  };

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setShowEditModal(true);
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
                <th className="py-2 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="py-2 pr-4 dark:text-slate-100">{u.name}</td>
                  <td className="py-2 pr-4 dark:text-slate-300">{u.email}</td>
                  <td className="py-2 pr-4 dark:text-slate-300">
                    <span className="capitalize">{u.role}</span>
                    {u.is_guest && (
                      <span className="ml-2 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded">
                        Guest
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4 dark:text-slate-300">{u.can_login ? 'Enabled' : 'Disabled'}</td>
                  <td className="py-2 pr-4 text-right">
                    <button
                      onClick={() => handleEditClick(u)}
                      className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                      title="Edit user"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  </td>
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

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedUser(null);
        }}
        onUpdate={handleUpdate}
        user={selectedUser}
        loading={updateMutation.isPending}
      />
    </div>
  );
}


