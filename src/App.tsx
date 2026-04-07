import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import NewCampaign from "./pages/NewCampaign";
import CampaignReview from "./pages/CampaignReview";
import CalendarView from "./pages/CalendarView";
import Onboarding from "./pages/Onboarding";
import StrategyCommandCenter from "./pages/StrategyCommandCenter";
import VisualDirector from "./pages/VisualDirector";
import AdminLibraries from "./pages/AdminLibraries";
import AdminDashboard from "./pages/AdminDashboard";
import UserLibraries from "./pages/UserLibraries";
import SocialSettings from "./pages/SocialSettings";
import NotFound from "./pages/NotFound";
import GlobalCMOChat from "./components/GlobalCMOChat";


const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/campaigns/new"
              element={
                <ProtectedRoute>
                  <NewCampaign />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/campaign/:id"
              element={
                <ProtectedRoute>
                  <CampaignReview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/strategy/new"
              element={
                <ProtectedRoute>
                  <StrategyCommandCenter />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/visual-director"
              element={
                <ProtectedRoute>
                  <VisualDirector />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <ProtectedRoute>
                  <CalendarView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/libraries"
              element={
                <ProtectedRoute>
                  <UserLibraries />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin/libraries"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AdminLibraries />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/social-settings"
              element={
                <ProtectedRoute>
                  <SocialSettings />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <GlobalCMOChat />
          
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
