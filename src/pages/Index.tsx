import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, useUpdateProfile } from '@/hooks/useBudget';
import { AuthForm } from '@/components/auth/AuthForm';
import { WelcomeTutorial } from '@/components/onboarding/WelcomeTutorial';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  // Legacy: if tutorial is done but onboarding flag is stale, sync it once.
  // Must live in an effect — calling mutate() during render re-fires on every render.
  const needsOnboardingSync = !!profile && profile.tutorial_completed && !profile.onboarding_completed;
  useEffect(() => {
    if (needsOnboardingSync && !updateProfile.isPending) {
      updateProfile.mutate({ onboarding_completed: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsOnboardingSync]);

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

  // Show tutorial for first-time users (includes category creation)
  if (profile && !profile.tutorial_completed) {
    const handleTutorialComplete = () => {
      updateProfile.mutate({ tutorial_completed: true, onboarding_completed: true });
    };
    return <WelcomeTutorial onComplete={handleTutorialComplete} />;
  }

  // Show dashboard
  return <Dashboard />;
};

export default Index;
