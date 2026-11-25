import { Navigate, Route, Routes } from 'react-router-dom';
import SiteLayout from './components/SiteLayout.jsx';
import HomePage from './pages/HomePage.jsx';
import WorkoutBuilderPage from './pages/WorkoutBuilderPage.jsx';
import ProgressPage from './pages/ProgressPage.jsx';
import AuthPage from './pages/AuthPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="workouts" element={<WorkoutBuilderPage />} />
        <Route path="progress" element={<ProgressPage />} />
        <Route path="login" element={<AuthPage mode="login" />} />
        <Route path="register" element={<AuthPage mode="register" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
