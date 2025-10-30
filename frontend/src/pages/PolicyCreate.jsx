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
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">New Policy</h1>
        <p className="text-base text-gray-600 dark:text-gray-400 max-w-2xl">
          Draft a policy, choose who needs to acknowledge it, and publish when you're ready. Save progress at any time; we'll keep your work until you send it.
        </p>
      </div>

      {/* Form */}
      <div className="card p-6 sm:p-8">
        <PolicyForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={createMutation.isPending}
        />
      </div>
    </div>
  );
}
