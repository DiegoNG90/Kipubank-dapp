import { cn } from "@/lib/utils";

export type StepperItem = {
  id: string;
  label: string;
};

type StepperProps = {
  steps: StepperItem[];
  currentStepId: string;
  className?: string;
};

export function Stepper({ steps, currentStepId, className }: StepperProps) {
  const currentIndex = steps.findIndex((step) => step.id === currentStepId);

  return (
    <ol
      className={cn("flex flex-wrap items-center gap-x-2 gap-y-3", className)}
      aria-label="Deposit progress"
    >
      {steps.map((step, index) => {
        const isComplete = currentIndex > index;
        const isCurrent = step.id === currentStepId;

        return (
          <li key={step.id} className="flex items-center gap-2">
            <span
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                isComplete && "bg-emerald-600 text-white",
                isCurrent &&
                  "bg-emerald-600/20 text-emerald-300 ring-2 ring-emerald-500/60",
                !isComplete &&
                  !isCurrent &&
                  "bg-zinc-800 text-zinc-500",
              )}
            >
              {isComplete ? "✓" : index + 1}
            </span>
            <span
              className={cn(
                "text-xs font-medium",
                isCurrent ? "text-zinc-100" : "text-zinc-500",
              )}
            >
              {step.label}
            </span>
            {index < steps.length - 1 && (
              <span
                className="mx-1 hidden h-px w-6 bg-zinc-700 sm:inline"
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
