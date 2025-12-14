import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import BugList from "./pages/BugList";
import BugDetail from "./pages/BugDetail";
import BugForm from "./pages/BugForm";
import AssignBug from "./pages/AssignBug";
import DuplicateBug from "./pages/DuplicateBug";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import AdminUsers from "./pages/AdminUsers";
import Reports from "./pages/Reports";
import Archive from "./pages/Archive";
import Export from "./pages/Export";
import ReadOnly from "./pages/ReadOnly";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (!isAdmin) return <Navigate to="/home" />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, isAdmin } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/home" /> : <Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={user ? <Navigate to="/home" /> : <Navigate to="/login" />} />
      
      <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/bugs" element={<ProtectedRoute><BugList /></ProtectedRoute>} />
      <Route path="/bug/:id" element={<ProtectedRoute><BugDetail /></ProtectedRoute>} />
      <Route path="/bug/:id/edit" element={<ProtectedRoute><BugForm /></ProtectedRoute>} />
      <Route path="/bug/:id/assign" element={<AdminRoute><AssignBug /></AdminRoute>} />
      <Route path="/bug/:id/duplicate" element={<AdminRoute><DuplicateBug /></AdminRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
      <Route path="/reports" element={<AdminRoute><Reports /></AdminRoute>} />
      <Route path="/archive" element={<AdminRoute><Archive /></AdminRoute>} />
      <Route path="/export" element={<ProtectedRoute><Export /></ProtectedRoute>} />
      <Route path="/readonly" element={<ProtectedRoute><ReadOnly /></ProtectedRoute>} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppRoutes />
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
