import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { UsageProvider } from './context/UsageContext';
import { UpgradeModal } from './components/UpgradeModal';
import { Layout } from './components/Layout';
import { AdminLayout } from './components/AdminLayout';
import { Protected, Guest, AdminGuard } from './components/Guards';
import { ErrorBoundary } from './components/ErrorBoundary';
import Login from './pages/Login';
import Otp from './pages/Otp';
import Dashboard from './pages/Dashboard';
import Words from './pages/Words';
import WordDetail from './pages/WordDetail';
import Favorites from './pages/Favorites';
import Review from './pages/Review';
import Roadmap from './pages/Roadmap';
import QuizList from './pages/QuizList';
import QuizDo from './pages/QuizDo';
import QuizResult from './pages/QuizResult';
import Grammar from './pages/Grammar';
import Chat from './pages/Chat';
import Speaking from './pages/Speaking';
import SpeakingResult from './pages/SpeakingResult';
import Profile from './pages/Profile';
import PaymentResult from './pages/PaymentResult';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminWords from './pages/admin/AdminWords';
import AdminQuizzes from './pages/admin/AdminQuizzes';
import AdminReports from './pages/admin/AdminReports';
import AdminAiAssistant from './pages/admin/AdminAiAssistant';
import LandingPage from './pages/LandingPage';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';

function HomeSwitcher() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Đang tải...</div>;
  if (!user) {
    return <LandingPage />;
  }
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  // Demo mode: HashRouter để chạy được trên static hosting không có SPA fallback.
  const Router = import.meta.env.VITE_DEMO === '1' ? HashRouter : BrowserRouter;
  return (
    <Router>
      <ErrorBoundary>
        <AuthProvider>
          <UsageProvider>
            <UpgradeModal />
            <Routes>
              {/* Public Landing Page & Legal Pages */}
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/dieu-khoan" element={<TermsOfService />} />
              <Route path="/chinh-sach-bao-mat" element={<PrivacyPolicy />} />

              {/* Root switch: Public guest sees LandingPage; Authenticated user redirects to /dashboard */}
              <Route path="/" element={<HomeSwitcher />} />

              <Route element={<Guest />}>
                <Route path="/login" element={<Login />} />
                <Route path="/otp" element={<Otp />} />
              </Route>
              <Route element={<Protected />}>
                <Route element={<Layout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/words" element={<Words />} />
                  <Route path="/words/:id" element={<WordDetail />} />
                  <Route path="/favorites" element={<Favorites />} />
                  <Route path="/review" element={<Review />} />
                  <Route path="/roadmap" element={<Roadmap />} />
                  <Route path="/quiz" element={<QuizList />} />
                  <Route path="/quiz/:id" element={<QuizDo />} />
                  <Route path="/quiz/:id/result" element={<QuizResult />} />
                  <Route path="/grammar" element={<Grammar />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/speaking" element={<Speaking />} />
                  <Route path="/speaking/result" element={<SpeakingResult />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/payment/success" element={<PaymentResult />} />
                  <Route path="/payment/cancel" element={<PaymentResult />} />
                </Route>
              </Route>

              {/* Admin Portal Routes */}
              <Route element={<AdminGuard />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/words" element={<AdminWords />} />
                  <Route path="/admin/quizzes" element={<AdminQuizzes />} />
                  <Route path="/admin/reports" element={<AdminReports />} />
                  <Route path="/admin/ai-assistant" element={<AdminAiAssistant />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </UsageProvider>
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  );
}
