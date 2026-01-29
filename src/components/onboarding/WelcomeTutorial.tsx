import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight, ChevronLeft, Wallet, PieChart, Target, Sparkles } from 'lucide-react';
import crystalLogo from '@/assets/crystal-logo.png';

interface TutorialStep {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    icon: <Sparkles className="w-12 h-12" />,
    title: 'Добро пожаловать в CrystalBudget!',
    description: 'Мы поможем вам управлять финансами легко и эффективно. Давайте познакомимся с основными функциями.',
  },
  {
    icon: <Wallet className="w-12 h-12" />,
    title: 'Добавляйте доходы',
    description: 'Записывайте все источники дохода — зарплату, подработки, инвестиции. Каждое поступление автоматически распределяется по категориям.',
  },
  {
    icon: <PieChart className="w-12 h-12" />,
    title: 'Распределяйте бюджет',
    description: 'Настройте категории расходов и укажите, какой процент или сумму выделять на каждую. Система сама рассчитает лимиты.',
  },
  {
    icon: <Target className="w-12 h-12" />,
    title: 'Следите за балансом',
    description: 'Отслеживайте, сколько осталось в каждой категории. Прогресс-бары покажут, насколько близки вы к лимиту.',
  },
];

interface WelcomeTutorialProps {
  onComplete: () => void;
}

export function WelcomeTutorial({ onComplete }: WelcomeTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const step = TUTORIAL_STEPS[currentStep];

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full gradient-primary opacity-20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full gradient-accent opacity-20 blur-3xl" />
      </div>

      <Card className="w-full max-w-lg glass-card relative z-10">
        <CardContent className="pt-8 pb-6 px-6">
          {/* Logo on first step */}
          {isFirstStep && (
            <div className="flex justify-center mb-6">
              <img
                src={crystalLogo}
                alt="CrystalBudget"
                className="w-24 h-24 object-cover rounded-2xl shadow-lg"
              />
            </div>
          )}

          {/* Step indicator */}
          <div className="flex justify-center gap-2 mb-6">
            {TUTORIAL_STEPS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-6 bg-primary'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>

          {/* Icon (not on first step) */}
          {!isFirstStep && (
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center text-white">
                {step.icon}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="text-center mb-8 animate-fade-in" key={currentStep}>
            <h2 className="text-2xl font-bold mb-3">{step.title}</h2>
            <p className="text-muted-foreground leading-relaxed">{step.description}</p>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3">
            {isFirstStep ? (
              <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
                Пропустить
              </Button>
            ) : (
              <Button variant="ghost" onClick={handlePrev}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Назад
              </Button>
            )}

            <Button onClick={handleNext} className="gradient-primary hover:opacity-90 min-w-[120px]">
              {isLastStep ? (
                'Начать'
              ) : (
                <>
                  Далее
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
