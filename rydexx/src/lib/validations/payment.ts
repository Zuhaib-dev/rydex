import { z } from "zod";

export const paymentCreateSchema = z.object({
  bookingId: z.string({
    message: "bookingId is required",
  }).regex(/^[0-9a-fA-F]{24}$/, "Invalid bookingId format"),
});

export const paymentVerifySchema = z.object({
  bookingId: z.string({
    message: "bookingId is required",
  }).regex(/^[0-9a-fA-F]{24}$/, "Invalid bookingId format"),
  razorpay_order_id: z.string({
    message: "razorpay_order_id is required",
  }).min(1, "razorpay_order_id is required"),
  razorpay_payment_id: z.string({
    message: "razorpay_payment_id is required",
  }).min(1, "razorpay_payment_id is required"),
  razorpay_signature: z.string({
    message: "razorpay_signature is required",
  }).min(1, "razorpay_signature is required"),
});

export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>;
export type PaymentVerifyInput = z.infer<typeof paymentVerifySchema>;
