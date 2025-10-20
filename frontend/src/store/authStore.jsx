import { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI } from '../api/client';

// Auth context
const AuthContext = createContext();

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload, isAuthenticated: !!action.payload };
    case 'SET_TOKEN':
      return { ...state, token: action.payload };
    case 'SET_WORKSPACES':
      return { ...state, availableWorkspaces: action.payload, requiresWorkspaceSelection: action.payload.length > 1 };
    case 'SET_SCOPE':
      return { ...state, scope: action.payload };
    case 'SET_ACTIVE_WORKSPACE':
      return { ...state, activeWorkspaceId: action.payload };
    case 'LOGOUT':
      return { ...state, user: null, token: null, isAuthenticated: false, availableWorkspaces: [], requiresWorkspaceSelection: false, scope: 'workspace', activeWorkspaceId: null };
    default:
      return state;
  }
};

// Initial state
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  availableWorkspaces: [],
  requiresWorkspaceSelection: false,
  scope: 'workspace',
  activeWorkspaceId: null,
};

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load auth state from localStorage on mount
  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        const scope = localStorage.getItem('scope') || 'workspace';
        const activeWorkspaceId = localStorage.getItem('activeWorkspaceId');
        
        if (token && userData) {
          dispatch({ type: 'SET_TOKEN', payload: token });
          dispatch({ type: 'SET_USER', payload: JSON.parse(userData) });
          dispatch({ type: 'SET_SCOPE', payload: scope });
          if (activeWorkspaceId) dispatch({ type: 'SET_ACTIVE_WORKSPACE', payload: activeWorkspaceId });
          
          // Verify token is still valid
          try {
            const response = await authAPI.getMe();
            const mergedUser = {
              ...JSON.parse(userData),
              ...response.data,
            };
            dispatch({ type: 'SET_USER', payload: mergedUser });
            localStorage.setItem('user', JSON.stringify(mergedUser));
          } catch (error) {
            // Token invalid, clear auth state
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            dispatch({ type: 'LOGOUT' });
          }
        }
      } catch (error) {
        console.error('Error loading auth state:', error);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadAuthState();
  }, []);

  // Login function
  const login = async (email, code, workspaceId) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await authAPI.verifyCode(email, code, workspaceId);
      const token = response.data?.access_token || response.data?.token;
      const user = response.data?.user;

      // Store in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      if (user?.workspace_id) {
        localStorage.setItem('activeWorkspaceId', user.workspace_id);
        dispatch({ type: 'SET_ACTIVE_WORKSPACE', payload: user.workspace_id });
      }

      // Update state
      dispatch({ type: 'SET_TOKEN', payload: token });
      dispatch({ type: 'SET_USER', payload: user });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed'
      };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeWorkspaceId');
    localStorage.removeItem('scope');
    dispatch({ type: 'LOGOUT' });
  };

  // Send verification code
  const sendCode = async (email, workspaceId) => {
    try {
      const response = await authAPI.sendCode(email, workspaceId);
      return { success: true, workspaceName: response.data?.workspace_name };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to send code'
      };
    }
  };

  // Login with token (for SSO)
  const loginWithToken = async (token) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Store token
      localStorage.setItem('token', token);
      dispatch({ type: 'SET_TOKEN', payload: token });

      // Get user info
      const response = await authAPI.getMe();
      const user = response.data;

      // Store user
      localStorage.setItem('user', JSON.stringify(user));
      if (user?.workspace_id) {
        localStorage.setItem('activeWorkspaceId', user.workspace_id);
        dispatch({ type: 'SET_ACTIVE_WORKSPACE', payload: user.workspace_id });
      }

      dispatch({ type: 'SET_USER', payload: user });

      return { success: true };
    } catch (error) {
      // Clear token if invalid
      localStorage.removeItem('token');
      dispatch({ type: 'SET_TOKEN', payload: null });

      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to authenticate'
      };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const value = {
    ...state,
    setScope: (scope) => {
      localStorage.setItem('scope', scope);
      dispatch({ type: 'SET_SCOPE', payload: scope });
    },
    setActiveWorkspace: (id) => {
      if (id) localStorage.setItem('activeWorkspaceId', id);
      dispatch({ type: 'SET_ACTIVE_WORKSPACE', payload: id });
    },
    login,
    loginWithToken,
    logout,
    sendCode,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};