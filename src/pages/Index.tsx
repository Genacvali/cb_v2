import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useBudget';
import { AuthForm } from '@/components/auth/AuthForm';
import { TemplateSelector } from '@/components/onboarding/TemplateSelector';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show auth form if not logged in
  if (!user) {
    return <AuthForm />;
  }

  // Show loading while fetching profile
  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show onboarding if not completed
  if (!profile?.onboarding_completed) {
    return <TemplateSelector />;
  }

  // Show dashboard
  return <Dashboard />;
};

export default Index;
