import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { policiesAPI } from '../api/client';
import { QUERY_KEYS } from '../utils/constants';
import PolicyForm from '../components/PolicyForm';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function PolicyEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: policy,
    isLoading,
    error
  } = useQuery({
    queryKey: QUERY_KEYS.POLICY(id),
    queryFn: () => policiesAPI.get(id).then(res => res.data),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (policyData) => policiesAPI.update(id, policyData),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.POLICIES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.POLICY(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD_STATS });
      toast.success('Policy updated successfully');
      navigate(`/policies/${id}`);
    },
    onError: (error) => {
      toast.error('Failed to update policy');
    },
  });

  const handleSubmit = (policyData) => {
    updateMutation.mutate(policyData);
  };

  const handleCancel = () => {
    navigate(`/policies/${id}`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Failed to load policy</div>
        <button
          onClick={() => navigate('/policies')}
          className="text-indigo-600 hover:text-indigo-500"
        >
          Back to policies
        </button>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">Policy not found</div>
        <button
          onClick={() => navigate('/policies')}
          className="text-indigo-600 hover:text-indigo-500"
        >
          Back to policies
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Policy</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Update the policy document and settings
        </p>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <PolicyForm
          policy={policy}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={updateMutation.isPending}
        />
      </div>
    </div>
  );
}
