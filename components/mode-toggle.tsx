// Dark / light mode toggle button — uses next-themes resolvedTheme
"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "@/components/icons";
import { Button } from "@/components/ui/button";

export function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="다크모드 토글"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
