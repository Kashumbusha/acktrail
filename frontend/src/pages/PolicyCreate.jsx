import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { policiesAPI } from '../api/client';
import { QUERY_KEYS } from '../utils/constants';
import PolicyForm from '../components/PolicyForm';
import toast from 'react-hot-toast';

export default function PolicyCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (policyData) => policiesAPI.create(policyData),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.POLICIES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD_STATS });
      toast.success('Policy created successfully');
      navigate(`/policies/${response.data.id}`);
    },
    onError: (error) => {
      toast.error('Failed to create policy');
    },
  });

  const handleSubmit = (policyData) => {
    createMutation.mutate(policyData);
  };

  const handleCancel = () => {
    navigate('/policies');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Policy</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Create a new policy document to be acknowledged by recipients
        </p>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <PolicyForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={createMutation.isPending}
        />
      </div>
    </div>
  );
}
