import { useState, useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || window.location.origin;

export default function SlackIntegration() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    team_id: '',
    team_name: '',
    bot_token: '',
    signing_secret: '',
    auto_sync_users: false,
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/slack/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfig(response.data);
      setFormData({
        team_id: response.data.team_id,
        team_name: response.data.team_name || '',
        bot_token: '',  // Don't show existing token
        signing_secret: '',  // Don't show existing secret
        auto_sync_users: response.data.auto_sync_users,
      });
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Error loading Slack config:', error);
        toast.error('Failed to load Slack configuration');
      }
      // 404 means not configured yet - that's okay, don't show error
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.team_id || !formData.bot_token || !formData.signing_secret) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = config
        ? `${API_BASE_URL}/api/slack/config`
        : `${API_BASE_URL}/api/slack/config`;

      const method = config ? 'patch' : 'post';

      const response = await axios[method](endpoint, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setConfig(response.data);
      setShowForm(false);
      toast.success('Slack configuration saved successfully');

      // Auto-test connection
      handleTest();
    } catch (error) {
      console.error('Error saving Slack config:', error);
      toast.error(error.response?.data?.detail || 'Failed to save Slack configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/api/slack/test`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.status === 'success') {
        toast.success(response.data.message);
        // Update team name if we got it
        if (response.data.team_info?.name && !config.team_name) {
          setConfig({ ...config, team_name: response.data.team_info.name });
        }
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error('Error testing Slack config:', error);
      toast.error(error.response?.data?.detail || 'Failed to test Slack connection');
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/api/slack/sync-users`, {
        create_new_users: true,
        update_existing: true,
        default_role: 'employee'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.status === 'success') {
        toast.success(
          `Synced ${response.data.users_created} new users, updated ${response.data.users_updated} users`
        );
        await loadConfig(); // Refresh to show last_synced_at
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error('Error syncing Slack users:', error);
      toast.error(error.response?.data?.detail || 'Failed to sync Slack users');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Slack? This will remove all Slack integration settings.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/slack/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setConfig(null);
      setFormData({
        team_id: '',
        team_name: '',
        bot_token: '',
        signing_secret: '',
        auto_sync_users: false,
      });
      toast.success('Slack disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting Slack:', error);
      toast.error(error.response?.data?.detail || 'Failed to disconnect Slack');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">
            Slack Integration
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Connect your Slack workspace to import users and send notifications
          </p>
        </div>
        {config && (
          <span className="inline-flex items-center gap-x-1.5 rounded-md bg-green-100 dark:bg-green-900/30 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400">
            <CheckCircleIcon className="h-4 w-4" />
            Connected
          </span>
        )}
      </div>

      {/* Configuration Status */}
      {config && !showForm ? (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                Workspace
              </label>
              <p className="mt-1 text-sm text-gray-900 dark:text-slate-100">
                {config.team_name || config.team_id}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                Team ID
              </label>
              <p className="mt-1 text-sm text-gray-900 dark:text-slate-100 font-mono">
                {config.team_id}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                Auto-sync Users
              </label>
              <p className="mt-1 text-sm text-gray-900 dark:text-slate-100">
                {config.auto_sync_users ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                Last Synced
              </label>
              <p className="mt-1 text-sm text-gray-900 dark:text-slate-100">
                {config.last_synced_at
                  ? new Date(config.last_synced_at).toLocaleString()
                  : 'Never'}
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              onClick={handleTest}
              disabled={testing}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 text-sm font-medium"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {syncing ? 'Syncing...' : 'Sync Users Now'}
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 text-sm font-medium"
            >
              Update Settings
            </button>
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium ml-auto"
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        /* Configuration Form */
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Team ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.team_id}
                onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
                placeholder="T01234567"
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-violet-500"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                Your Slack workspace Team ID (starts with T)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Workspace Name (Optional)
              </label>
              <input
                type="text"
                value={formData.team_name}
                onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
                placeholder="My Company"
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Bot User OAuth Token <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={formData.bot_token}
                onChange={(e) => setFormData({ ...formData, bot_token: e.target.value })}
                placeholder="xoxb-..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-violet-500 font-mono text-sm"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                From OAuth & Permissions page (starts with xoxb-)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Signing Secret <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={formData.signing_secret}
                onChange={(e) => setFormData({ ...formData, signing_secret: e.target.value })}
                placeholder="********************************"
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-violet-500 font-mono text-sm"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                From Basic Information → App Credentials
              </p>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="auto-sync"
                checked={formData.auto_sync_users}
                onChange={(e) => setFormData({ ...formData, auto_sync_users: e.target.checked })}
                className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
              />
              <label htmlFor="auto-sync" className="ml-2 block text-sm text-gray-900 dark:text-slate-100">
                Automatically sync users periodically
              </label>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 text-sm font-medium"
              >
                {saving ? 'Saving...' : config ? 'Update Configuration' : 'Connect Slack'}
              </button>
              {config && (
                <button
                  onClick={() => {
                    setShowForm(false);
                    setFormData({
                      team_id: config.team_id,
                      team_name: config.team_name || '',
                      bot_token: '',
                      signing_secret: '',
                      auto_sync_users: config.auto_sync_users,
                    });
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-slate-100 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 text-sm font-medium"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Setup Instructions */}
      {!config && !showForm && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">
            How to set up Slack integration:
          </h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700 dark:text-blue-300">
            <li>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="underline">api.slack.com/apps</a></li>
            <li>Create a new app "From scratch"</li>
            <li>Add bot scopes: users:read, users:read.email, team:read</li>
            <li>Install the app to your workspace</li>
            <li>Copy Team ID, Bot Token, and Signing Secret</li>
            <li>Paste them above and click "Connect Slack"</li>
          </ol>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-sm font-medium"
          >
            Get Started
          </button>
        </div>
      )}
    </div>
  );
}
