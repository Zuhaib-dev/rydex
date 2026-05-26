import { emitToSocketServer } from "./socketServer";

type BookingEventPayload = {
  bookingId: unknown;
  status?: string;
  paymentStatus?: string;
  driver?: unknown;
  driverMobileNumber?: string;
};

type BookingEventTarget = {
  user?: unknown;
  driver?: unknown;
};

const toId = (value: unknown) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "_id" in value && value._id) {
    return String(value._id);
  }
  return String(value);
};

export async function emitBookingUpdated(
  booking: BookingEventTarget,
  data: BookingEventPayload,
) {
  const userId = toId(booking.user);
  const driverId = toId(booking.driver);

  await Promise.all([
    userId
      ? emitToSocketServer({
          userId,
          event: "booking-updated",
          data,
        })
      : Promise.resolve(),
    driverId && driverId !== userId
      ? emitToSocketServer({
          userId: driverId,
          event: "booking-updated",
          data,
        })
      : Promise.resolve(),
  ]);
}
