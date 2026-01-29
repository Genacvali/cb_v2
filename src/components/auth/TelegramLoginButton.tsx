import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface TelegramLoginButtonProps {
  botName: string;
  onSuccess?: () => void;
}

export function TelegramLoginButton({ botName, onSuccess }: TelegramLoginButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Define callback for Telegram widget
    (window as any).onTelegramAuth = async (user: TelegramUser) => {
      setLoading(true);
      try {
        // Call edge function to verify and login
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-auth`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify(user),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to authenticate');
        }

        if (data.access_token && data.refresh_token) {
          // Set session from tokens
          const { error } = await supabase.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
          });

          if (error) throw error;

          toast({
            title: 'Успешный вход!',
            description: `Добро пожаловать, ${user.first_name}!`,
          });

          onSuccess?.();
        } else {
          throw new Error('No session returned');
        }
      } catch (error) {
        console.error('Telegram auth error:', error);
        toast({
          title: 'Ошибка входа',
          description: error instanceof Error ? error.message : 'Не удалось войти через Telegram',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    // Load Telegram widget script
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '8');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(script);
    }

    return () => {
      delete (window as any).onTelegramAuth;
    };
  }, [botName, toast, onSuccess]);

  if (loading) {
    return (
      <Button disabled className="w-full" variant="outline">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Вход через Telegram...
      </Button>
    );
  }

  return (
    <div className="flex justify-center">
      <div ref={containerRef} />
    </div>
  );
}
