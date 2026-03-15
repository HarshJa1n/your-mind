import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/logo%20(1).png";

export function BrandLogo({
  href,
  showWordmark = true,
  size = "md",
  className,
}: {
  href?: string;
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const content = (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span
        className={cn(
          "relative overflow-hidden rounded-[1.2rem] ring-1 ring-black/6 shadow-[0_10px_30px_rgba(255,0,140,0.2)]",
          size === "sm" && "h-9 w-9 rounded-xl",
          size === "md" && "h-11 w-11 rounded-[1rem]",
          size === "lg" && "h-14 w-14 rounded-[1.15rem]"
        )}
      >
        <Image
          src={LOGO_SRC}
          alt="YourMind logo"
          fill
          sizes="56px"
          className="object-cover"
          priority={size !== "sm"}
        />
      </span>
      {showWordmark ? (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "font-black tracking-[-0.05em] text-foreground",
              size === "sm" && "text-lg",
              size === "md" && "text-xl",
              size === "lg" && "text-2xl"
            )}
          >
            YourMind
          </span>
          <span className="text-[11px] font-medium uppercase tracking-[0.34em] text-muted-foreground">
            Think in any language
          </span>
        </span>
      ) : null}
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} className="inline-flex items-center">
      {content}
    </Link>
  );
}
