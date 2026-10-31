import { lazy, Suspense } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { UsageProvider } from './context/UsageContext';
import { UpgradeModal } from './components/UpgradeModal';
import { Layout } from './components/Layout';
import { AdminLayout } from './components/AdminLayout';
import { Protected, Guest, AdminGuard } from './components/Guards';
import { ErrorBoundary } from './components/ErrorBoundary';

// Landing Page is loaded directly for optimal LCP & FCP
import LandingPage from './pages/LandingPage';

// Lazy load non-landing pages to drastically reduce initial bundle size & Total Blocking Time
const Login = lazy(() => import('./pages/Login'));
const Otp = lazy(() => import('./pages/Otp'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Words = lazy(() => import('./pages/Words'));
const WordDetail = lazy(() => import('./pages/WordDetail'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Review = lazy(() => import('./pages/Review'));
const Roadmap = lazy(() => import('./pages/Roadmap'));
const QuizList = lazy(() => import('./pages/QuizList'));
const QuizDo = lazy(() => import('./pages/QuizDo'));
const QuizResult = lazy(() => import('./pages/QuizResult'));
const Grammar = lazy(() => import('./pages/Grammar'));
const Chat = lazy(() => import('./pages/Chat'));
const Speaking = lazy(() => import('./pages/Speaking'));
const SpeakingResult = lazy(() => import('./pages/SpeakingResult'));
const Profile = lazy(() => import('./pages/Profile'));
const PaymentResult = lazy(() => import('./pages/PaymentResult'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminWords = lazy(() => import('./pages/admin/AdminWords'));
const AdminQuizzes = lazy(() => import('./pages/admin/AdminQuizzes'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const AdminAiAssistant = lazy(() => import('./pages/admin/AdminAiAssistant'));
const PlacementTest = lazy(() => import('./pages/PlacementTest'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));

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
            <Suspense fallback={<div className="loading" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Đang tải...</div>}>
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
                  <Route path="/placement" element={<PlacementTest />} />
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
                    <Route path="/admin/orders" element={<AdminOrders />} />
                    <Route path="/admin/users" element={<AdminUsers />} />
                    <Route path="/admin/words" element={<AdminWords />} />
                    <Route path="/admin/quizzes" element={<AdminQuizzes />} />
                    <Route path="/admin/reports" element={<AdminReports />} />
                    <Route path="/admin/ai-assistant" element={<AdminAiAssistant />} />
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </UsageProvider>
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  );
}
