import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { authApi, clearSessionState, getSessionToken, setAuthInterceptor } from "@/lib/auth";
import { useChatStore } from "@/store/chatStore";
import { useToast } from "@/hooks/use-toast";
import Home from "@/pages/home";
import Chat from "@/pages/chat";
import DashboardPage from "@/pages/dashboard";
import AccountPage from "@/pages/account";
import Login from "@/pages/login";
import Register from "@/pages/register";
import VerifyEmail from "@/pages/verify-email";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import NotFound from "@/pages/not-found";
import RoomPage from "@/pages/rooms/room";
import PrivateChatsPage from "@/pages/private-chats";
import { useSettingsStore, applySettingsToDom } from "@/store/settingsStore";
import { SplashScreen } from "@/components/splash-screen";
import { ErrorBoundary } from "@/components/error-boundary";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { socketService } from "@/services/socket";

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return null;
  if (!user) return <Redirect to="/login" />;
  return <>{children}</>;
}

function GuestGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return null;
  if (user) return <Redirect to="/dashboard" />;
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        {() => <Redirect to="/login" />}
      </Route>
      <Route path="/login">
        {() => <GuestGuard><Login /></GuestGuard>}
      </Route>
      <Route path="/register">
        {() => <GuestGuard><Register /></GuestGuard>}
      </Route>
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/forgot-password">
        {() => <GuestGuard><ForgotPassword /></GuestGuard>}
      </Route>
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/chat">
        {() => <AuthGuard><Chat /></AuthGuard>}
      </Route>
      <Route path="/dashboard">
        {() => <AuthGuard><DashboardPage /></AuthGuard>}
      </Route>
      <Route path="/account">
        {() => <AuthGuard><AccountPage /></AuthGuard>}
      </Route>
      <Route path="/messages">
        {() => <AuthGuard><PrivateChatsPage /></AuthGuard>}
      </Route>
      <Route path="/messages/:chatId">
        {() => <AuthGuard><PrivateChatsPage /></AuthGuard>}
      </Route>
      <Route path="/rooms/:roomId">
        {() => <AuthGuard><RoomPage /></AuthGuard>}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { setUser, setLoading, setAuthError, logout, authError, isLoading } = useAuthStore();
  const { setCurrentUsername } = useChatStore();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAppReady, setIsAppReady] = useState(false);

  useSupabaseRealtime();

  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;
    void socketService.ensureAuthenticated();
  }, [user]);

  useEffect(() => {
    if (!isLoading) setIsAppReady(true);
  }, [isLoading]);

  useEffect(() => {
    applySettingsToDom(useSettingsStore.getState());

    setAuthInterceptor((errorMessage) => {
      logout();
      setAuthError(errorMessage);
      setLocation('/login');
      toast({
        title: 'Session Expired',
        description: errorMessage,
        variant: 'destructive',
      });
    });

    const existingToken = getSessionToken();
    if (!existingToken) {
      setLoading(false);
      return;
    }

    let authTimeout: number | undefined;
    const timeout = new Promise<never>((_, reject) => {
      authTimeout = window.setTimeout(() => reject(new Error('Authentication request timed out')), 5000);
    });

    Promise.race([authApi.me(), timeout])
      .then((user) => {
        setUser(user);
        setCurrentUsername(user.username);
        localStorage.setItem("uchat_username", user.username);
      })
      .catch(() => {
        clearSessionState();
        setUser(null);
      })
      .finally(() => {
        if (authTimeout !== undefined) window.clearTimeout(authTimeout);
        setLoading(false);
      });
  }, []);

  // Display auth error on login page if available
  useEffect(() => {
    if (authError && location === '/login') {
      toast({
        title: 'Authentication Error',
        description: authError,
        variant: 'destructive',
      });
      setAuthError(null);
    }
  }, [authError, location]);

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ErrorBoundary>
            <WouterRouter>
              <Router />
            </WouterRouter>
          </ErrorBoundary>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
      <AnimatePresence>{!isAppReady ? <SplashScreen /> : null}</AnimatePresence>
    </>
  );
}

function App() {
  return <AppContent />;
}

export default App;

