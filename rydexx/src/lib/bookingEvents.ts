import connectDb from "./db";
import Booking from "@/models/booking.model";
import { notifyAdminDashboard } from "./adminEvents";
import {
  createBookingEventId,
  serializeBookingForClient,
  type BookingClientPayload,
} from "./bookingRealtime";
import { emitToSocketServer } from "./socketServer";

type BookingDoc = {
  _id?: unknown;
  user?: unknown;
  driver?: unknown;
  populate?: (path: string | string[]) => Promise<unknown>;
  populated?: (path: string) => boolean;
};

type BookingEventTarget = {
  user?: unknown;
  driver?: unknown;
  _id?: unknown;
};

const toId = (value: unknown) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "_id" in value && value._id) {
    return String(value._id);
  }
  return String(value);
};

async function ensurePopulated(booking: BookingDoc) {
  if (typeof booking.populate !== "function") return booking;
  const needsDriver = booking.driver && !booking.populated?.("driver");
  if (needsDriver) {
    await (booking.populate as (path: string | string[]) => Promise<unknown>)(
      ["driver", "vehicle"],
    );
  }
  return booking;
}

async function dispatchBookingEvent(
  booking: BookingEventTarget,
  event: "booking-updated" | "booking-sync",
  patch: Partial<BookingClientPayload> = {},
) {
  const bookingId = String(booking._id ?? patch.bookingId);
  const base = serializeBookingForClient(booking as Record<string, unknown>);
  const data: BookingClientPayload = {
    ...base,
    ...patch,
    bookingId,
    eventId: patch.eventId ?? createBookingEventId(),
    at: patch.at ?? Date.now(),
  };

  const userId = toId(booking.user);
  const driverId = toId(booking.driver);

  await Promise.all([
    userId
      ? emitToSocketServer({
          userId,
          event,
          data,
          bookingId,
        })
      : Promise.resolve(),
    driverId && driverId !== userId
      ? emitToSocketServer({
          userId: driverId,
          event,
          data,
          bookingId,
        })
      : Promise.resolve(),
  ]);

  const status = data.status ? String(data.status) : undefined;
  const scope =
    data.sosTriggered || status === "completed" || status === "cancelled"
      ? "all"
      : "map";

  await notifyAdminDashboard({
    scope,
    reason: data.sosTriggered ? "sos" : event,
  });

  return data;
}

/** Push a full booking snapshot + optional patch to user, driver, and booking room. */
export async function emitBookingUpdated(
  bookingInput: BookingDoc,
  patch: Partial<BookingClientPayload> = {},
) {
  await connectDb();
  const booking = await ensurePopulated(bookingInput);
  return dispatchBookingEvent(booking, "booking-updated", patch);
}

/** Alias for full sync (same transport, explicit intent). */
export async function emitBookingSync(
  bookingInput: BookingDoc | string,
  patch: Partial<BookingClientPayload> = {},
) {
  await connectDb();
  const booking =
    typeof bookingInput === "string"
      ? await Booking.findById(bookingInput)
      : bookingInput;
  if (!booking) return null;
  const populated = await ensurePopulated(booking);
  return dispatchBookingEvent(populated, "booking-sync", patch);
}
