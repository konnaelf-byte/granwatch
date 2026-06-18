import { SignIn } from "@clerk/react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import ElderProfile from "./pages/ElderProfile";
import CreateElder from "./pages/CreateElder";
import JoinFamily from "./pages/JoinFamily";
import Notifications from "./pages/Notifications";
import ElderSettings from "./pages/ElderSettings";
import { PaymentSuccess, PaymentCancel } from "./pages/PaymentResult";
import Account from "./pages/Account";
import Admin from "./pages/Admin";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import InstallPrompt from "./components/InstallPrompt";

function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <SignIn routing="path" path="/sign-in" />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/sign-in" component={SignInPage} />
      <Route path="/sign-in/sso-callback" component={SignInPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/elder/:id" component={ElderProfile} />
      <Route path="/create" component={CreateElder} />
      <Route path="/join/:code?" component={JoinFamily} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/elder/:id/settings" component={ElderSettings} />
      <Route path="/account" component={Account} />
      <Route path="/admin" component={Admin} />
      <Route path="/payment/success" component={PaymentSuccess} />
      <Route path="/payment/cancel" component={PaymentCancel} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          {/* Skip-to-content link for keyboard and switch-access users */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:font-semibold focus:text-sm"
          >
            Skip to main content
          </a>
          <Toaster richColors position="top-center" />
          <Router />
          <InstallPrompt />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
