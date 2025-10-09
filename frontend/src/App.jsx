import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './store/authStore';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PolicyList from './pages/PolicyList';
import PolicyCreate from './pages/PolicyCreate';
import PolicyEdit from './pages/PolicyEdit';
import PolicyDetail from './pages/PolicyDetail';
import AcknowledgePage from './pages/AcknowledgePage';
import SuccessPage from './pages/SuccessPage';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/ack/:token" element={<AcknowledgePage />} />
              <Route path="/success" element={<SuccessPage />} />

              {/* Private routes */}
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/policies"
                element={
                  <PrivateRoute>
                    <Layout>
                      <PolicyList />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/policies/new"
                element={
                  <PrivateRoute>
                    <Layout>
                      <PolicyCreate />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/policies/:id"
                element={
                  <PrivateRoute>
                    <Layout>
                      <PolicyDetail />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/policies/:id/edit"
                element={
                  <PrivateRoute>
                    <Layout>
                      <PolicyEdit />
                    </Layout>
                  </PrivateRoute>
                }
              />

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>

          {/* Toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                style: {
                  background: '#10B981',
                },
              },
              error: {
                style: {
                  background: '#EF4444',
                },
              },
            }}
          />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
