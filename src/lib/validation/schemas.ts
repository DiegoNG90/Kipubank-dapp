import { z } from "zod";
import { getAddress, isAddress, parseUnits } from "viem";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export const ethereumAddressSchema = z
  .string()
  .trim()
  .min(1, "Address is required.")
  .refine((val) => isAddress(val), { message: "Invalid Ethereum address." })
  .transform((val) => getAddress(val) as `0x${string}`);

export function makeAmountSchema(options: {
  decimals: number;
  max?: bigint;
  label?: string;
}) {
  const { decimals, max, label = "Amount" } = options;

  return z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .superRefine((val, ctx) => {
      if (!/^\d+(\.\d+)?$/.test(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} must be a positive number.`,
        });
        return;
      }

      const num = Number(val);
      if (Number.isNaN(num) || num <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} must be greater than zero.`,
        });
        return;
      }

      const decimalPart = val.split(".")[1];
      if (decimalPart && decimalPart.length > decimals) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} has too many decimal places (max ${decimals}).`,
        });
      }
    })
    .transform((val, ctx) => {
      try {
        const parsed = parseUnits(val, decimals);
        if (max !== undefined && parsed > max) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${label} exceeds the maximum allowed.`,
          });
          return z.NEVER;
        }
        return parsed;
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} is invalid.`,
        });
        return z.NEVER;
      }
    });
}

function firstErrorMessage(error: z.ZodError): string {
  return error.errors[0]?.message ?? "Validation failed.";
}

export function validateTokenAddress(
  input: string,
): ValidationResult<`0x${string}`> {
  const result = ethereumAddressSchema.safeParse(input);
  if (result.success) return { ok: true, value: result.data };
  return { ok: false, error: firstErrorMessage(result.error) };
}

export function parseAndValidateAmount(
  input: string,
  decimals: number,
  max?: bigint,
  label?: string,
): ValidationResult<bigint> {
  const result = makeAmountSchema({ decimals, max, label }).safeParse(input);
  if (result.success) return { ok: true, value: result.data };
  return { ok: false, error: firstErrorMessage(result.error) };
}
