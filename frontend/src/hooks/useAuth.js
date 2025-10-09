import { useAuth as useAuthContext } from '../store/authStore';

// Re-export the useAuth hook from the auth store
// This provides a clean separation and allows for additional auth-related hooks if needed
export const useAuth = useAuthContext;