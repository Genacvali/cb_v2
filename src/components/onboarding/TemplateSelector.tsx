import { CATEGORY_TEMPLATES, CategoryTemplate } from '@/types/budget';
import { useApplyTemplate } from '@/hooks/useBudget';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, Laptop, Users, Check, Loader2 } from 'lucide-react';
import { useState } from 'react';

const iconMap: Record<string, React.ReactNode> = {
  wallet: <Wallet className="w-6 h-6" />,
  laptop: <Laptop className="w-6 h-6" />,
  users: <Users className="w-6 h-6" />,
};

export function TemplateSelector() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const applyTemplate = useApplyTemplate();

  const handleSelect = async (template: CategoryTemplate) => {
    setSelectedTemplate(template.id);
    await applyTemplate.mutateAsync(template);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full gradient-primary opacity-20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full gradient-accent opacity-20 blur-3xl" />
      </div>
      
      <div className="relative z-10 w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Добро пожаловать в BudgetFlow!</h1>
          <p className="text-muted-foreground">Выберите шаблон для быстрого старта</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {CATEGORY_TEMPLATES.map((template) => (
            <Card 
              key={template.id} 
              className={`glass-card hover-lift cursor-pointer transition-all ${
                selectedTemplate === template.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => !applyTemplate.isPending && handleSelect(template)}
            >
              <CardHeader className="text-center">
                <div className="mx-auto w-14 h-14 rounded-xl gradient-primary flex items-center justify-center text-white mb-3">
                  {iconMap[template.icon]}
                </div>
                <CardTitle className="text-xl">{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2 text-muted-foreground">Доходы:</p>
                  <div className="flex flex-wrap gap-1">
                    {template.incomeCategories.map((cat) => (
                      <Badge key={cat.name} variant="secondary" className="text-xs">
                        {cat.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2 text-muted-foreground">Расходы:</p>
                  <div className="flex flex-wrap gap-1">
                    {template.expenseCategories.slice(0, 4).map((cat) => (
                      <Badge key={cat.name} variant="outline" className="text-xs">
                        {cat.name}
                      </Badge>
                    ))}
                    {template.expenseCategories.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.expenseCategories.length - 4}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <Button 
                  className="w-full gradient-primary hover:opacity-90"
                  disabled={applyTemplate.isPending}
                >
                  {applyTemplate.isPending && selectedTemplate === template.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Применяю...
                    </>
                  ) : selectedTemplate === template.id ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Выбран
                    </>
                  ) : (
                    'Выбрать'
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
