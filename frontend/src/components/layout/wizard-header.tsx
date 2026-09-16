import { cn } from "@/lib/utils";

export const WIZARD_TOTAL_STEPS = 3;

/** 코스 만들기 위저드 상단 - 라벨 + "1 / 3" + 3칸 진행 바 */
export function WizardHeader({
  step,
  label,
}: {
  step: number;
  label: string;
}) {
  return (
    <div className="sticky top-0 z-10 shrink-0 bg-background px-inset pt-4 pb-3">
      <div className="flex items-center justify-between text-12 text-muted-foreground">
        <span>{label}</span>
        <span>
          {step} / {WIZARD_TOTAL_STEPS}
        </span>
      </div>
      <div className="mt-2 flex gap-1">
        {Array.from({ length: WIZARD_TOTAL_STEPS }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-0.5 flex-1 rounded-full",
              i < step ? "bg-primary" : "bg-border"
            )}
          />
        ))}
      </div>
    </div>
  );
}
