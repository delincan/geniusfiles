import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("gf-skeleton rounded-2xl", className)} {...props} />;
}

export { Skeleton };
