import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme/ThemeProvider";

interface ThemeToggleProps {
  isCollapsed?: boolean;
}

export function ThemeToggle({ isCollapsed }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const icon = theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />;
  const label = theme === "light" ? "Dark Mode" : "Light Mode";

  return (
    <Button
      variant="sidebar"
      className={`w-full justify-start ${isCollapsed ? "px-2" : "px-4"}`}
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      {icon}
      {!isCollapsed && <span className="ml-2">{label}</span>}
    </Button>
  );
}
