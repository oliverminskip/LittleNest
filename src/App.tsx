import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ToastProvider } from '@/hooks/useToast';
import { AppShell, ParentShell } from '@/components/AppShell';
import { LandingPage } from '@/components/public/LandingPage';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { MinderDashboard } from '@/screens/MinderDashboard';
import { TimelineScreen } from '@/screens/TimelineScreen';
import { InvoicingScreen } from '@/screens/InvoicingScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { ChildScreen } from '@/screens/ChildScreen';
import { ParentHome } from '@/screens/ParentHome';
import { Spinner } from '@/components/ui/Primitives';

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-[68px] w-[68px] items-center justify-center rounded-4xl bg-gradient-to-br from-brand-400 to-brand-700 text-[32px] shadow-lg">
          🪺
        </div>
        <Spinner className="!my-0" />
      </div>
    </div>
  );
}

/**
 * Routing gate.
 *
 * The whole point of the public site is that it is never shown to someone who
 * already has a session — so nothing renders until `status` resolves, and a
 * signed-in visitor at `/` is redirected to their own dashboard by role.
 */
function AppRoutes() {
  const { status, isMinder } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <Splash />;

  if (status === 'signed-out') {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<Navigate to="/" replace state={{ from: location.pathname }} />} />
      </Routes>
    );
  }

  if (status === 'needs-onboarding') {
    return (
      <Routes>
        <Route path="/onboarding" element={<OnboardingScreen />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  const home = isMinder ? '/app' : '/parent';

  return (
    <Routes>
      <Route path="/" element={<Navigate to={home} replace />} />
      <Route path="/onboarding" element={<Navigate to={home} replace />} />

      {isMinder ? (
        <Route
          path="/app/*"
          element={
            <AppShell>
              <Routes>
                <Route index element={<MinderDashboard />} />
                <Route path="timeline" element={<TimelineScreen />} />
                <Route path="invoices" element={<InvoicingScreen />} />
                <Route path="settings" element={<SettingsScreen />} />
                <Route path="child/:childId" element={<ChildScreen />} />
                <Route path="*" element={<Navigate to="/app" replace />} />
              </Routes>
            </AppShell>
          }
        />
      ) : (
        <Route
          path="/parent/*"
          element={
            <ParentShell>
              <Routes>
                <Route index element={<ParentHome />} />
                <Route path="child/:childId" element={<ChildScreen />} />
                <Route path="*" element={<Navigate to="/parent" replace />} />
              </Routes>
            </ParentShell>
          }
        />
      )}

      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
