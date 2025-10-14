import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './store/authStore';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Landing from './pages/Landing';
import Pricing from './pages/Pricing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import PolicyList from './pages/PolicyList';
import AdminUsers from './pages/AdminUsers';
import PlatformDashboard from './pages/PlatformDashboard';
import Teams from './pages/Teams';
import TeamDetail from './pages/TeamDetail';
import PolicyCreate from './pages/PolicyCreate';
import PolicyEdit from './pages/PolicyEdit';
import PolicyDetail from './pages/PolicyDetail';
import AcknowledgePage from './pages/AcknowledgePage';
import SuccessPage from './pages/SuccessPage';
import MagicLinkVerify from './pages/MagicLinkVerify';
import CheckoutSuccess from './pages/CheckoutSuccess';
import CheckoutCancelled from './pages/CheckoutCancelled';
import Billing from './pages/Billing';
import Settings from './pages/Settings';
import PublicLayout from './components/PublicLayout';
import Legal from './pages/Legal';
import MyAssignments from './pages/MyAssignments';
import Hiring from './pages/Hiring';

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
          <div className="App font-sans bg-gray-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 min-h-screen bg-grid-pattern dark:bg-grid-pattern-dark">
            <Routes>
              {/* Public routes */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/legal" element={<Legal />} />
                <Route path="/hiring" element={<Hiring />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/signup/success" element={<CheckoutSuccess />} />
                <Route path="/signup/cancelled" element={<CheckoutCancelled />} />
                <Route path="/verify" element={<MagicLinkVerify />} />
                <Route path="/ack/:token" element={<AcknowledgePage />} />
                <Route path="/success" element={<SuccessPage />} />
              </Route>

              {/* Private routes */}
              <Route path="/admin/users" element={<PrivateRoute><Layout><AdminUsers /></Layout></PrivateRoute>} />
              <Route path="/platform" element={<PrivateRoute><Layout><PlatformDashboard /></Layout></PrivateRoute>} />
              <Route path="/billing" element={<PrivateRoute><Layout><Billing /></Layout></PrivateRoute>} />
              <Route path="/settings" element={<PrivateRoute><Layout><Settings /></Layout></PrivateRoute>} />
              <Route path="/my-assignments" element={<PrivateRoute><Layout><MyAssignments /></Layout></PrivateRoute>} />
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
              <Route
                path="/teams"
                element={
                  <PrivateRoute>
                    <Layout>
                      <Teams />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/teams/:id"
                element={
                  <PrivateRoute>
                    <Layout>
                      <TeamDetail />
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
