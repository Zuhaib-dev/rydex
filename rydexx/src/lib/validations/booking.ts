import { z } from "zod";

export const bookingCreateSchema = z.object({
  quoteId: z.string({
    message: "quoteId is required — create a locked quote first",
  }).min(1, "quoteId is required — create a locked quote first"),
  mobileNumber: z.union([z.string(), z.number()]).optional().refine(
    (val) => {
      if (val === undefined) return true;
      const digits = String(val).replace(/\D/g, "");
      return digits.length >= 7 && digits.length <= 15;
    },
    {
      message: "Invalid mobile number format",
    }
  ),
  driverId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid driverId format").optional(),
});

export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;
