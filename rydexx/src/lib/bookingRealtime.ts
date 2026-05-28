/**
 * Client-safe booking payloads and merge helpers for real-time sync.
 */

export type BookingClientPayload = {
  bookingId: string;
  eventId?: string;
  at?: number;
  status?: string;
  paymentStatus?: string;
  pickupOtp?: string;
  dropOtp?: string;
  pickupOtpExpires?: string | Date | null;
  dropOtpExpires?: string | Date | null;
  fare?: number;
  pickupAddress?: string;
  dropAddress?: string;
  userMobileNumber?: string;
  driverMobileNumber?: string;
  sosTriggered?: boolean;
  sosTriggeredAt?: string | Date | null;
  driver?: { _id?: string; name?: string } | null;
  vehicle?: {
    _id?: string;
    vehicleModel?: string;
    number?: string;
    vehicleNumber?: string;
  } | null;
  [key: string]: unknown;
};

function toPlainId(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "_id" in value) {
    return String((value as { _id: unknown })._id);
  }
  return String(value);
}

export function serializeBookingForClient(booking: Record<string, unknown>): BookingClientPayload {
  const driver = booking.driver as Record<string, unknown> | undefined;
  const vehicle = booking.vehicle as Record<string, unknown> | undefined;

  return {
    bookingId: String(booking._id),
    status: booking.status as string | undefined,
    paymentStatus: booking.paymentStatus as string | undefined,
    pickupOtp: (booking.pickupOtp as string) || "",
    dropOtp: (booking.dropOtp as string) || "",
    pickupOtpExpires: booking.pickupOtpExpires as string | Date | null | undefined,
    dropOtpExpires: booking.dropOtpExpires as string | Date | null | undefined,
    fare: booking.fare as number | undefined,
    pickupAddress: booking.pickupAddress as string | undefined,
    dropAddress: booking.dropAddress as string | undefined,
    userMobileNumber: booking.userMobileNumber as string | undefined,
    driverMobileNumber: booking.driverMobileNumber as string | undefined,
    sosTriggered: booking.sosTriggered as boolean | undefined,
    sosTriggeredAt: booking.sosTriggeredAt as string | Date | null | undefined,
    driver: driver
      ? {
          _id: toPlainId(driver._id ?? driver),
          name: driver.name as string | undefined,
        }
      : undefined,
    vehicle: vehicle
      ? {
          _id: toPlainId(vehicle._id ?? vehicle),
          vehicleModel: (vehicle.vehicleModel as string) || undefined,
          number: (vehicle.number as string) || (vehicle.vehicleNumber as string) || undefined,
        }
      : undefined,
  };
}

export function mergeBookingPatch<T extends Record<string, unknown>>(
  prev: T | null,
  patch: Partial<BookingClientPayload>,
): T | null {
  if (!prev) return patch as T;

  const next = { ...prev, ...patch } as T & BookingClientPayload;

  if (patch.driver && typeof patch.driver === "object") {
    (next as Record<string, unknown>).driver = {
      ...((prev.driver as object) || {}),
      ...patch.driver,
    };
  }

  if (patch.vehicle && typeof patch.vehicle === "object") {
    const v = patch.vehicle;
    (next as Record<string, unknown>).vehicle = {
      ...((prev.vehicle as object) || {}),
      vehicleModel: v.vehicleModel,
      number: v.number ?? v.vehicleNumber,
    };
  }

  if (patch.pickupOtp === "") (next as Record<string, unknown>).pickupOtp = "";
  if (patch.dropOtp === "") (next as Record<string, unknown>).dropOtp = "";

  return next;
}

export function createBookingEventId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
