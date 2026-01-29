import { useAuth } from '@/hooks/useAuth';
import { useProfile, useUpdateProfile } from '@/hooks/useBudget';
import { AuthForm } from '@/components/auth/AuthForm';
import { WelcomeTutorial } from '@/components/onboarding/WelcomeTutorial';
import { TemplateSelector } from '@/components/onboarding/TemplateSelector';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();

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

  // Show tutorial for first-time users (before template selection)
  if (profile && !profile.tutorial_completed) {
    const handleTutorialComplete = () => {
      updateProfile.mutate({ tutorial_completed: true });
    };
    return <WelcomeTutorial onComplete={handleTutorialComplete} />;
  }

  // Show onboarding if not completed
  if (!profile?.onboarding_completed) {
    return <TemplateSelector />;
  }

  // Show dashboard
  return <Dashboard />;
};

export default Index;
