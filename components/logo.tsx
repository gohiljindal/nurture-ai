import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  inverted?: boolean;
  className?: string;
}

export function Logo({
  size = 40,
  showWordmark = true,
  inverted = false,
  className,
}: LogoProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <Image src="/logo.svg" width={size} height={size} alt="NurtureAI" priority />
      {showWordmark ? (
        <span
          className="truncate text-xl leading-none tracking-tight sm:text-2xl [font-family:var(--font-nunito),ui-sans-serif,system-ui,sans-serif]"
          style={{
            color: inverted ? "rgba(255,255,255,0.95)" : "#0f172a",
          }}
        >
          nurture{" "}
          <span
            className={
              inverted
                ? "bg-gradient-to-r from-violet-200 to-sky-200 bg-clip-text font-extrabold text-transparent"
                : "bg-gradient-to-r from-violet-600 to-blue-500 bg-clip-text font-extrabold text-transparent"
            }
          >
            ai
          </span>
        </span>
      ) : null}
    </div>
  );
}
