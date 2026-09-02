import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./panel/context/AuthContext.jsx";
import { SocketProvider } from "./panel/context/SocketContext.jsx";

// Public Website Pages
import LandingPage from "./pages/LandingPage.jsx";
import AuthPage from "./pages/AuthPage.jsx";

// Panel Layouts
import PanelLayout from "./panel/layouts/PanelLayout.jsx";
import ServerLayout from "./panel/layouts/ServerLayout.jsx";

// Panel Pages
import Dashboard from "./panel/pages/Dashboard.jsx";
import ServerList from "./panel/pages/ServerList.jsx";
import CreateServer from "./panel/pages/CreateServer.jsx";
import Onboarding from "./panel/pages/Onboarding.jsx";
import AccountSettings from "./panel/pages/account/AccountSettings.jsx";

// Server Specific Pages
import ServerConsole from "./panel/pages/server/ServerConsole.jsx";
import ServerConnect from "./panel/pages/server/ServerConnect.jsx";
import ServerFiles from "./panel/pages/server/ServerFiles.jsx";
import ServerBackups from "./panel/pages/server/ServerBackups.jsx";
import ServerSchedules from "./panel/pages/server/ServerSchedules.jsx";
import ServerPlayers from "./panel/pages/server/ServerPlayers.jsx";
import ServerDatabases from "./panel/pages/server/ServerDatabases.jsx";
import ServerNetwork from "./panel/pages/server/ServerNetwork.jsx";
import ServerSettings from "./panel/pages/server/ServerSettings.jsx";

// Admin Pages
import AdminOverview from "./panel/pages/admin/AdminOverview.jsx";
import AdminUsers from "./panel/pages/admin/AdminUsers.jsx";
import AdminNodes from "./panel/pages/admin/AdminNodes.jsx";
import AdminAllocations from "./panel/pages/admin/AdminAllocations.jsx";
import AdminActivity from "./panel/pages/admin/AdminActivity.jsx";
import AdminSettings from "./panel/pages/admin/AdminSettings.jsx";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#08090d] flex items-center justify-center text-p1 font-mono text-sm">
        Authenticating session...
      </div>
    );
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { isAdmin, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#08090d] flex items-center justify-center text-p1 font-mono text-sm">
        Verifying permissions...
      </div>
    );
  }
  return isAdmin ? children : <Navigate to="/panel" replace />;
};

const App = () => {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Landing & Authentication */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/register" element={<AuthPage mode="register" />} />
            <Route path="/forgot-password" element={<AuthPage mode="forgot-password" />} />
            <Route path="/reset-password" element={<AuthPage mode="reset-password" />} />
            <Route path="/verify-email" element={<AuthPage mode="verify-email" />} />

            {/* Protected Panel Routes (Global Navigation Context) */}
            <Route
              path="/panel"
              element={
                <ProtectedRoute>
                  <PanelLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="onboarding" element={<Onboarding />} />
              <Route path="servers" element={<ServerList />} />
              <Route path="servers/create" element={<CreateServer />} />
              <Route path="account" element={<AccountSettings />} />

              {/* Admin Routes */}
              <Route
                path="admin"
                element={
                  <AdminRoute>
                    <AdminOverview />
                  </AdminRoute>
                }
              />
              <Route
                path="admin/users"
                element={
                  <AdminRoute>
                    <AdminUsers />
                  </AdminRoute>
                }
              />
              <Route
                path="admin/nodes"
                element={
                  <AdminRoute>
                    <AdminNodes />
                  </AdminRoute>
                }
              />
              <Route
                path="admin/allocations"
                element={
                  <AdminRoute>
                    <AdminAllocations />
                  </AdminRoute>
                }
              />
              <Route
                path="admin/activity"
                element={
                  <AdminRoute>
                    <AdminActivity />
                  </AdminRoute>
                }
              />
              <Route
                path="admin/settings"
                element={
                  <AdminRoute>
                    <AdminSettings />
                  </AdminRoute>
                }
              />
            </Route>

            {/* Dedicated Server Workspace Routes (Server Navigation Context) */}
            <Route
              path="/panel/servers/:id"
              element={
                <ProtectedRoute>
                  <ServerLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<ServerConsole />} />
              <Route path="console" element={<ServerConsole />} />
              <Route path="connect" element={<ServerConnect />} />
              <Route path="files" element={<ServerFiles />} />
              <Route path="players" element={<ServerPlayers />} />
              <Route path="backups" element={<ServerBackups />} />
              <Route path="schedules" element={<ServerSchedules />} />
              <Route path="databases" element={<ServerDatabases />} />
              <Route path="network" element={<ServerNetwork />} />
              <Route path="settings" element={<ServerSettings />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
};

export default App;
