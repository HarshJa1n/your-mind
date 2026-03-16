import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { GlowingEffect } from "@/components/ui/glowing-effect";

export function GlowCard({
  children,
  className,
  innerClassName,
  glow = true,
  interactive = true,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  glow?: boolean;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative rounded-[1.5rem] border border-white/10 bg-[rgba(255,255,255,0.02)] p-[1px] shadow-[0_30px_80px_rgba(0,0,0,0.18)]",
        className
      )}
    >
      <GlowingEffect
        spread={38}
        glow={glow}
        disabled={!interactive}
        proximity={72}
        inactiveZone={0.08}
        borderWidth={2}
      />
      <div
        className={cn(
          "relative rounded-[calc(1.5rem-1px)] border border-white/8 bg-card/92 backdrop-blur-xl",
          innerClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
