import { Routes, Route } from 'react-router-dom';
import { AppLayout } from '../components/Layout/AppLayout';
import { ProtectedRoute } from '../components/Auth/ProtectedRoute';

import { LandingPage } from '../pages/marketing/LandingPage';
import { UserFlowPage } from '../pages/marketing/UserFlowPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { RegisterPlanPage } from '../pages/auth/RegisterPlanPage';
import { DashboardPage } from '../pages/app/DashboardPage';
import { NewPostPage } from '../pages/app/NewPostPage';
import { ScheduledPostsPage } from '../pages/app/ScheduledPostsPage';
import { CalendarPage } from '../pages/app/CalendarPage';
import { AnalyticsPage } from '../pages/app/AnalyticsPage';
import { SettingsPage } from '../pages/app/SettingsPage';
import { ConnectedAccountsPage } from '../pages/app/ConnectedAccountsPage';
import { TrendingTopicsPage } from '../pages/app/TrendingTopicsPage';
import { ClaudeIdeasPage } from '../pages/app/ClaudeIdeasPage';
import { AdminUsersPage } from '../pages/admin/AdminUsersPage';
import { PlanPage } from '../pages/onboarding/PlanPage';
import { ProfilePage } from '../pages/onboarding/ProfilePage';
import { ConnectPage } from '../pages/onboarding/ConnectPage';

export function AppRoutes() {
  return (
    <Routes>
      {/* Public marketing */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/flow" element={<UserFlowPage />} />

      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/register/plan" element={<RegisterPlanPage />} />

      {/* Legacy onboarding (optional) */}
      <Route
        path="/onboarding/plan"
        element={
          <ProtectedRoute>
            <PlanPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/onboarding/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/onboarding/connect"
        element={
          <ProtectedRoute>
            <ConnectPage />
          </ProtectedRoute>
        }
      />

      {/* Authenticated app */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/posts/new" element={<NewPostPage />} />
        <Route path="/posts/calendar" element={<CalendarPage />} />
        <Route path="/posts/scheduled" element={<ScheduledPostsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/accounts" element={<ConnectedAccountsPage />} />
        <Route path="/ideas" element={<ClaudeIdeasPage />} />
        <Route path="/trending" element={<TrendingTopicsPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
      </Route>
    </Routes>
  );
}
