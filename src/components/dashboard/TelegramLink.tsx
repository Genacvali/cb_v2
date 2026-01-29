import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Bot, Copy, Check, Unlink, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function TelegramLink() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  // Fetch telegram link status
  const { data: profile, isLoading } = useQuery({
    queryKey: ['telegram-link', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('telegram_id, telegram_link_code, telegram_linked_at')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Generate link code
  const generateCode = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      
      // Generate random 6-char code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const { error } = await supabase
        .from('profiles')
        .update({ telegram_link_code: code })
        .eq('user_id', user.id);
      
      if (error) throw error;
      return code;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram-link'] });
      toast({
        title: 'Код создан',
        description: 'Отправьте его боту для привязки аккаунта',
      });
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Unlink telegram
  const unlinkTelegram = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          telegram_id: null, 
          telegram_link_code: null,
          telegram_linked_at: null 
        })
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram-link'] });
      toast({
        title: 'Telegram отвязан',
        description: 'Вы можете привязать другой аккаунт',
      });
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'CrystalBudgetBot';
  const telegramBotUrl = profile?.telegram_link_code
    ? `https://t.me/${botUsername}?start=${profile.telegram_link_code}`
    : `https://t.me/${botUsername}`;

  const copyCode = () => {
    if (profile?.telegram_link_code) {
      navigator.clipboard.writeText(`/start ${profile.telegram_link_code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Скопировано!',
        description: `Отправьте команду боту @${botUsername}`,
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isLinked = !!profile?.telegram_id;
  const hasCode = !!profile?.telegram_link_code;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Telegram бот</CardTitle>
        </div>
        <CardDescription>
          Управляй бюджетом прямо из Telegram
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLinked ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-green-500" />
              <span>Telegram привязан</span>
              {profile?.telegram_linked_at && (
                <span className="text-xs">
                  ({new Date(profile.telegram_linked_at).toLocaleDateString('ru-RU')})
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => unlinkTelegram.mutate()}
              disabled={unlinkTelegram.isPending}
              className="w-full"
            >
              {unlinkTelegram.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Unlink className="w-4 h-4 mr-2" />
              )}
              Отвязать Telegram
            </Button>
          </div>
        ) : hasCode ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Нажмите кнопку ниже — откроется Telegram с ботом. Нажмите «START» в чате, и аккаунт привяжется автоматически.
            </p>
            <Button
              asChild
              className="w-full gradient-primary"
            >
              <a href={telegramBotUrl} target="_blank" rel="noopener noreferrer">
                <Bot className="w-4 h-4 mr-2" />
                Открыть бота и привязать аккаунт
              </a>
            </Button>
            <div className="flex gap-2 items-center">
              <Input 
                value={`/start ${profile?.telegram_link_code}`} 
                readOnly 
                className="font-mono text-sm flex-1"
              />
              <Button variant="outline" size="icon" onClick={copyCode} title="Скопировать команду">
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <Button
              variant="link"
              size="sm"
              className="px-0 h-auto text-muted-foreground"
              asChild
            >
              <a href={telegramBotUrl} target="_blank" rel="noopener noreferrer">
                Или открыть @{botUsername} →
              </a>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Привяжи Telegram для управления бюджетом через бота
            </p>
            <Button
              onClick={() => generateCode.mutate()}
              disabled={generateCode.isPending}
              className="w-full gradient-primary"
            >
              {generateCode.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Bot className="w-4 h-4 mr-2" />
              )}
              Привязать Telegram
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
