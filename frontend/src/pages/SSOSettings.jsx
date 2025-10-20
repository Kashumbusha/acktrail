import React, { useState, useEffect } from 'react';
import { ssoAPI } from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function SSOSettings() {
  const { user } = useAuth();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    tenant_id: '',
    client_id: '',
    client_secret: '',
    auto_provision_users: true,
    default_role: 'employee',
    enforce_sso: false
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ssoAPI.getConfig();
      setConfig(data);
      setFormData({
        tenant_id: data.tenant_id,
        client_id: data.client_id,
        client_secret: '', // Never show secret
        auto_provision_users: data.auto_provision_users,
        default_role: data.default_role,
        enforce_sso: data.enforce_sso
      });
    } catch (err) {
      if (err.response?.status !== 404) {
        setError('Failed to load SSO configuration');
        console.error('Failed to load SSO config:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (config) {
        // Only send client_secret if it was changed
        const updateData = { ...formData };
        if (!updateData.client_secret) {
          delete updateData.client_secret;
        }
        await ssoAPI.updateConfig(updateData);
        setSuccess('SSO configuration updated successfully!');
      } else {
        await ssoAPI.createConfig(formData);
        setSuccess('SSO configuration saved successfully!');
      }
      loadConfig();
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save SSO configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setError(null);
    setSuccess(null);
    try {
      const result = await ssoAPI.testConfig();
      setSuccess(result.message || 'SSO test successful!');
      loadConfig(); // Reload to get updated test status
    } catch (err) {
      setError(err.response?.data?.detail || 'SSO test failed');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete the SSO configuration? This will disable SSO for your workspace.')) {
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      await ssoAPI.deleteConfig();
      setSuccess('SSO configuration deleted successfully');
      setConfig(null);
      setFormData({
        tenant_id: '',
        client_id: '',
        client_secret: '',
        auto_provision_users: true,
        default_role: 'employee',
        enforce_sso: false
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete SSO configuration');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">SSO Configuration</h1>
        <p className="text-gray-600 mt-2">Configure Single Sign-On with Microsoft 365 for your workspace</p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Instructions Toggle */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <button
          type="button"
          onClick={() => setShowInstructions(!showInstructions)}
          className="text-blue-700 font-semibold flex items-center gap-2 hover:text-blue-800"
        >
          <span>{showInstructions ? '▼' : '▶'}</span>
          <span>Setup Instructions</span>
        </button>

        {showInstructions && (
          <div className="mt-4 space-y-4 text-sm text-gray-700">
            <h3 className="font-semibold text-lg">How to set up Microsoft 365 SSO:</h3>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>Go to <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Azure Portal</a></li>
              <li>Navigate to "Azure Active Directory" → "App registrations"</li>
              <li>Click "New registration"</li>
              <li>Enter name: <strong>"AckTrail SSO"</strong></li>
              <li>Select "Accounts in this organizational directory only"</li>
              <li>Set Redirect URI: <code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">https://acktrail.com/api/auth/sso/microsoft/callback</code></li>
              <li>Click "Register"</li>
              <li>Copy "Directory (tenant) ID" → paste in Tenant ID field below</li>
              <li>Copy "Application (client) ID" → paste in Client ID field below</li>
              <li>Go to "Certificates & secrets" → "New client secret"</li>
              <li>Copy the secret <strong>value</strong> (not the ID) → paste in Client Secret field below</li>
              <li>Go to "API permissions" → Add "User.Read" permission</li>
              <li>Click "Grant admin consent"</li>
              <li>Fill in the form below and click Save</li>
            </ol>
          </div>
        )}
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleSubmit} className="space-y-6 bg-white border rounded-lg p-6 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tenant ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.tenant_id}
            onChange={(e) => setFormData({...formData, tenant_id: e.target.value})}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Found in Azure AD → Overview → Directory (tenant) ID</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Client ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.client_id}
            onChange={(e) => setFormData({...formData, client_id: e.target.value})}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Application (client) ID from your app registration</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Client Secret {!config && <span className="text-red-500">*</span>}
          </label>
          <input
            type="password"
            value={formData.client_secret}
            onChange={(e) => setFormData({...formData, client_secret: e.target.value})}
            placeholder={config ? 'Enter new secret to update (leave blank to keep current)' : 'Enter client secret value'}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={!config}
          />
          <p className="text-xs text-gray-500 mt-1">Client secret value (not the ID) from Certificates & secrets</p>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-4">User Provisioning Settings</h3>

          <div className="space-y-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={formData.auto_provision_users}
                onChange={(e) => setFormData({...formData, auto_provision_users: e.target.checked})}
                className="mt-1"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Auto-create users on first SSO login</span>
                <p className="text-xs text-gray-500">If disabled, users must be manually invited before they can login via SSO</p>
              </div>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default role for new users
              </label>
              <select
                value={formData.default_role}
                onChange={(e) => setFormData({...formData, default_role: e.target.value})}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Role assigned to auto-provisioned users</p>
            </div>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={formData.enforce_sso}
                onChange={(e) => setFormData({...formData, enforce_sso: e.target.checked})}
                className="mt-1"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Enforce SSO (disable password login)</span>
                <p className="text-xs text-gray-500">When enabled, users can only login via Microsoft SSO</p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex gap-4 pt-4 border-t">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {saving ? 'Saving...' : (config ? 'Update Configuration' : 'Save Configuration')}
          </button>

          {config && (
            <>
              <button
                type="button"
                onClick={handleTest}
                className="border border-gray-300 px-6 py-2 rounded-lg hover:bg-gray-50 font-medium"
              >
                Test Connection
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="border border-red-300 text-red-600 px-6 py-2 rounded-lg hover:bg-red-50 font-medium ml-auto"
              >
                Delete Configuration
              </button>
            </>
          )}
        </div>
      </form>

      {/* Status */}
      {config && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="font-semibold text-green-800">SSO is configured and {config.is_active ? 'active' : 'inactive'}</span>
          </div>
          {config.last_tested_at && (
            <p className="text-sm text-gray-600 mt-2">
              Last tested: {new Date(config.last_tested_at).toLocaleString()} - Status: {config.test_status}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
