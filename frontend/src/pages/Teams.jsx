import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, PencilIcon, TrashIcon, UsersIcon } from '@heroicons/react/24/outline';
import { teamsAPI } from '../api/client';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await teamsAPI.list();
      setTeams(response.data.teams);
    } catch (error) {
      toast.error('Failed to load teams');
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) {
      toast.error('Please enter a team name');
      return;
    }

    try {
      setSubmitting(true);
      await teamsAPI.create(teamName.trim());
      toast.success('Team created successfully');
      setShowCreateModal(false);
      setTeamName('');
      fetchTeams();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create team');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditTeam = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) {
      toast.error('Please enter a team name');
      return;
    }

    try {
      setSubmitting(true);
      await teamsAPI.update(selectedTeam.id, teamName.trim());
      toast.success('Team updated successfully');
      setShowEditModal(false);
      setSelectedTeam(null);
      setTeamName('');
      fetchTeams();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update team');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTeam = async () => {
    try {
      setSubmitting(true);
      await teamsAPI.delete(selectedTeam.id);
      toast.success('Team deleted successfully');
      setShowDeleteModal(false);
      setSelectedTeam(null);
      fetchTeams();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete team');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (team) => {
    setSelectedTeam(team);
    setTeamName(team.name);
    setShowEditModal(true);
  };

  const openDeleteModal = (team) => {
    setSelectedTeam(team);
    setShowDeleteModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate dark:text-slate-100">
              Teams
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              Organize your policies by creating teams for different departments or groups
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Create Team
            </button>
          </div>
        </div>

        {/* Teams List */}
        <div className="mt-8">
          {teams.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200 dark:bg-slate-900 dark:border-slate-800">
              <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-slate-100">No teams</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                Get started by creating a new team
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  Create Team
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow dark:bg-slate-900 dark:border-slate-800"
                >
                  <div className="flex items-start justify-between">
                    <Link
                      to={`/teams/${team.id}`}
                      className="flex-1 min-w-0 cursor-pointer"
                    >
                      <h3 className="text-lg font-medium text-gray-900 truncate hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400 transition-colors">
                        {team.name}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                        {team.policy_count} {team.policy_count === 1 ? 'policy' : 'policies'}
                      </p>
                      <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                        Created {new Date(team.created_at).toLocaleDateString()}
                      </p>
                    </Link>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(team);
                        }}
                        className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                        title="Edit team"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteModal(team);
                        }}
                        className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        title="Delete team"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => !submitting && setShowCreateModal(false)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 dark:bg-slate-900">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-950">
                  <UsersIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-slate-100">
                    Create New Team
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Teams help you organize policies by department or group
                    </p>
                  </div>
                </div>
              </div>
              <form onSubmit={handleCreateTeam} className="mt-5">
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Team name (e.g., Engineering, HR, Sales)"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                  disabled={submitting}
                  autoFocus
                />
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                  <button
                    type="submit"
                    disabled={submitting || !teamName.trim()}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? <LoadingSpinner size="sm" /> : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    disabled={submitting}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {showEditModal && selectedTeam && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => !submitting && setShowEditModal(false)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 dark:bg-slate-900">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-950">
                  <PencilIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-slate-100">
                    Edit Team
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Update the team name
                    </p>
                  </div>
                </div>
              </div>
              <form onSubmit={handleEditTeam} className="mt-5">
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Team name"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                  disabled={submitting}
                  autoFocus
                />
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                  <button
                    type="submit"
                    disabled={submitting || !teamName.trim()}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? <LoadingSpinner size="sm" /> : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    disabled={submitting}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Team Modal */}
      {showDeleteModal && selectedTeam && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => !submitting && setShowDeleteModal(false)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 dark:bg-slate-900">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-950">
                  <TrashIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-slate-100">
                    Delete Team
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Are you sure you want to delete <strong>{selectedTeam.name}</strong>?
                      {selectedTeam.policy_count > 0 && (
                        <span className="block mt-2 text-red-600 dark:text-red-400">
                          This team has {selectedTeam.policy_count} associated {selectedTeam.policy_count === 1 ? 'policy' : 'policies'}.
                          Please reassign or delete the policies first.
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  onClick={handleDeleteTeam}
                  disabled={submitting || selectedTeam.policy_count > 0}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:col-start-2 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? <LoadingSpinner size="sm" /> : 'Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={submitting}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
