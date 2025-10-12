import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamsAPI, usersAPI } from '../api/client';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, UserPlusIcon, UserMinusIcon, UsersIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';

export default function TeamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');

  // Fetch team details
  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: ['team', id],
    queryFn: () => teamsAPI.get(id).then(res => res.data),
  });

  // Fetch all users (to show available users to add)
  const { data: usersData } = useQuery({
    queryKey: ['users', 'staff'],
    queryFn: () => usersAPI.list({ type: 'staff' }).then(res => res.data),
    enabled: showAddMember,
  });

  const team = teamData?.team;
  const members = team?.members || [];
  const allUsers = usersData?.users || [];

  // Filter out users who are already members
  const availableUsers = allUsers.filter(
    user => !members.some(member => member.id === user.id)
  );

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: (userId) => teamsAPI.addMember(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', id] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Member added successfully');
      setShowAddMember(false);
      setSelectedUserId('');
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: (userId) => teamsAPI.removeMember(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', id] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Member removed successfully');
    },
  });

  const handleAddMember = () => {
    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }
    addMemberMutation.mutate(selectedUserId);
  };

  const handleRemoveMember = (userId, userName) => {
    if (window.confirm(`Remove ${userName} from this team?`)) {
      removeMemberMutation.mutate(userId);
    }
  };

  if (teamLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Team not found</p>
        <Link to="/teams" className="text-indigo-600 dark:text-indigo-400 hover:underline mt-4 inline-block">
          Back to Teams
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/teams')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{team.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {members.length} {members.length === 1 ? 'member' : 'members'} • {team.policy_count} {team.policy_count === 1 ? 'policy' : 'policies'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddMember(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <UserPlusIcon className="h-5 w-5 mr-2" />
          Add Member
        </button>
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Add Team Member</h3>

            {availableUsers.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                All users are already members of this team or other teams.
              </p>
            ) : (
              <>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select User
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                >
                  <option value="">Select a user...</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email}) - {user.role}
                    </option>
                  ))}
                </select>
              </>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddMember(false);
                  setSelectedUserId('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                Cancel
              </button>
              {availableUsers.length > 0 && (
                <button
                  onClick={handleAddMember}
                  disabled={!selectedUserId || addMemberMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-md disabled:opacity-50"
                >
                  {addMemberMutation.isPending ? 'Adding...' : 'Add Member'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <UsersIcon className="h-5 w-5 mr-2" />
            Team Members
          </h2>
        </div>

        {members.length === 0 ? (
          <div className="p-12 text-center">
            <UsersIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No members</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by adding a member to this team.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowAddMember(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                <UserPlusIcon className="h-5 w-5 mr-2" />
                Add Member
              </button>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {members.map((member) => (
              <li key={member.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                          <span className="text-indigo-600 dark:text-indigo-300 font-medium">
                            {member.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {member.name}
                          {member.is_guest && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                              Guest
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {member.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      {member.role}
                    </span>

                    <button
                      onClick={() => handleRemoveMember(member.id, member.name)}
                      disabled={removeMemberMutation.isPending}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors disabled:opacity-50"
                      title="Remove from team"
                    >
                      <UserMinusIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
