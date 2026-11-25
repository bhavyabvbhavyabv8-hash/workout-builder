import { Navigate, Route, Routes } from 'react-router-dom';
import SiteLayout from './components/SiteLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ActiveWorkoutPage from './pages/ActiveWorkoutPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import HomePage from './pages/HomePage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import WorkoutBuilderPage from './pages/WorkoutBuilderPage.jsx';
import WorkoutDetailPage from './pages/WorkoutDetailPage.jsx';
import WorkoutEditorPage from './pages/WorkoutEditorPage.jsx';
import ProgressPage from './pages/ProgressPage.jsx';
import AuthPage from './pages/AuthPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<AuthPage mode="login" />} />
        <Route path="register" element={<AuthPage mode="register" />} />
        <Route element={<ProtectedRoute />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="workouts" element={<WorkoutBuilderPage />} />
          <Route path="workouts/new" element={<WorkoutEditorPage />} />
          <Route path="workouts/:workoutId" element={<WorkoutDetailPage />} />
          <Route path="workouts/:workoutId/edit" element={<WorkoutEditorPage />} />
          <Route path="sessions/:sessionId" element={<ActiveWorkoutPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
