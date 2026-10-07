import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home } from "lucide-react";
import crystalLogo from "@/assets/crystal-logo.png";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404: попытка открыть несуществующий маршрут:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full gradient-primary opacity-20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full gradient-accent opacity-20 blur-3xl" />
      </div>

      <Card className="w-full max-w-md glass-card relative z-10">
        <CardContent className="pt-8 pb-6 text-center space-y-4">
          <img
            src={crystalLogo}
            alt="CrystalBudget"
            className="mx-auto w-16 h-16 object-cover rounded-2xl shadow-lg"
          />
          <h1 className="text-5xl font-bold gradient-text">404</h1>
          <p className="text-muted-foreground">
            Такой страницы нет. Возможно, ссылка устарела или в адресе опечатка.
          </p>
          <Button asChild className="gradient-primary hover:opacity-90 transition-opacity">
            <Link to="/">
              <Home className="w-4 h-4 mr-2" />
              На главную
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
