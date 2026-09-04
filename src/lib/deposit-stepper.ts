export type DepositWizardStep =
  | "token"
  | "amount"
  | "approve"
  | "confirm"
  | "success";

export type DepositStepperContext = {
  tokenAddress?: `0x${string}`;
  tokenAddressError?: string;
  parsedAmount?: bigint;
  amountError?: string;
  needsApproval: boolean;
  isUsdc: boolean;
  hasLiquidity: boolean;
  wouldExceedCap: boolean;
  approveSimReady: boolean;
  depositSimReady: boolean;
  isPendingTx: boolean;
};

export const DEPOSIT_STEP_LABELS: Record<DepositWizardStep, string> = {
  token: "Token",
  amount: "Amount",
  approve: "Approve",
  confirm: "Confirm",
  success: "Done",
};

export function getVisibleSteps(needsApproval: boolean): DepositWizardStep[] {
  if (needsApproval) {
    return ["token", "amount", "approve", "confirm", "success"];
  }
  return ["token", "amount", "confirm", "success"];
}

export function getStepperLabels(needsApproval: boolean) {
  return getVisibleSteps(needsApproval).map((step) => ({
    id: step,
    label: DEPOSIT_STEP_LABELS[step],
  }));
}

export function canAdvanceFrom(
  step: DepositWizardStep,
  ctx: DepositStepperContext,
): boolean {
  switch (step) {
    case "token":
      return !!ctx.tokenAddress && !ctx.tokenAddressError;
    case "amount":
      return (
        !!ctx.parsedAmount &&
        !ctx.amountError &&
        !ctx.wouldExceedCap &&
        (ctx.isUsdc || ctx.hasLiquidity)
      );
    case "approve":
      return !ctx.needsApproval;
    case "confirm":
    case "success":
      return false;
    default:
      return false;
  }
}

export function getNextStep(
  current: DepositWizardStep,
  needsApproval: boolean,
): DepositWizardStep | null {
  const steps = getVisibleSteps(needsApproval);
  const index = steps.indexOf(current);
  if (index === -1 || index >= steps.length - 1) return null;
  return steps[index + 1] ?? null;
}

export function getPreviousStep(
  current: DepositWizardStep,
  needsApproval: boolean,
): DepositWizardStep | null {
  const steps = getVisibleSteps(needsApproval);
  const index = steps.indexOf(current);
  if (index <= 0) return null;
  return steps[index - 1] ?? null;
}

export function isStepComplete(
  step: DepositWizardStep,
  current: DepositWizardStep,
  needsApproval: boolean,
): boolean {
  const steps = getVisibleSteps(needsApproval);
  const stepIndex = steps.indexOf(step);
  const currentIndex = steps.indexOf(current);
  if (stepIndex === -1 || currentIndex === -1) return false;
  return stepIndex < currentIndex;
}

export function canSubmitApprove(ctx: DepositStepperContext): boolean {
  return (
    ctx.needsApproval &&
    ctx.approveSimReady &&
    !ctx.isPendingTx &&
    !!ctx.parsedAmount
  );
}

export function canSubmitDeposit(ctx: DepositStepperContext): boolean {
  return (
    !ctx.needsApproval &&
    ctx.depositSimReady &&
    !ctx.isPendingTx &&
    !!ctx.parsedAmount &&
    !ctx.wouldExceedCap
  );
}

export function getApprovePreviewCopy(
  symbol: string,
  amountLabel: string,
): string {
  return `MetaMask will ask you to approve KipuBank to move up to ${amountLabel} ${symbol} from your wallet. This does not deposit yet — it only grants spending permission.`;
}

export function getDepositPreviewCopy(isUsdc: boolean, symbol: string): string {
  if (isUsdc) {
    return `MetaMask will ask you to confirm a transfer of ${symbol} to KipuBank. Your balance will be credited in USDC with no swap.`;
  }
  return `MetaMask will ask you to confirm depositing ${symbol}. KipuBank will swap it to USDC via Uniswap V2 and credit your vault balance.`;
}
