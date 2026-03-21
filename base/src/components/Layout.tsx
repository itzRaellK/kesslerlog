import { Link, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { Moon, Sun, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Home", path: "/" },
  { label: "Jogos", path: "/games" },
  { label: "Sessões & Reviews", path: "/sessions" },
  { label: "Stats", path: "/stats" },
  { label: "Configurações", path: "/settings" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-8 px-8">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <Gamepad2 className="h-5 w-5 text-primary" />
            <span className="text-sm">LUDEX</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                  location.pathname === item.path
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
              U
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-8 py-6">
        {children}
      </main>
    </div>
  );
}
