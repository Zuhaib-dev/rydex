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
  matchRadiusMeters?: number;
  matchRadiusKm?: number;
  dispatchEtaMinutes?: number;
  searchingMessage?: string;
  tripDistanceKm?: number;
  durationMinutes?: number;
  routePolyline?: GeoJSON.LineString;
  pricingSnapshot?: Record<string, unknown>;
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

  const pickupOtp =
    typeof booking.pickupOtp === "string" ? booking.pickupOtp : undefined;
  const dropOtp =
    typeof booking.dropOtp === "string" ? booking.dropOtp : undefined;

  return {
    bookingId: String(booking._id),
    status: booking.status as string | undefined,
    paymentStatus: booking.paymentStatus as string | undefined,
    ...(pickupOtp ? { pickupOtp } : {}),
    ...(dropOtp ? { dropOtp } : {}),
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
    tripDistanceKm: booking.tripDistanceKm as number | undefined,
    durationMinutes: booking.durationMinutes as number | undefined,
    routePolyline: booking.routePolyline as GeoJSON.LineString | undefined,
    pricingSnapshot: booking.pricingSnapshot as Record<string, unknown> | undefined,
  };
}

export function mergeBookingPatch<T extends object>(
  prev: T | null,
  patch: Partial<BookingClientPayload>,
): T | null {
  if (!prev) return patch as T;

  const { pickupOtp, dropOtp, driver, vehicle, ...rest } = patch;
  const next = { ...prev, ...rest } as T & BookingClientPayload;

  if (driver && typeof driver === "object") {
    (next as Record<string, unknown>).driver = {
      ...((prev as Record<string, unknown>).driver as object) || {},
      ...driver,
    };
  }

  if (vehicle && typeof vehicle === "object") {
    (next as Record<string, unknown>).vehicle = {
      ...((prev as Record<string, unknown>).vehicle as object) || {},
      vehicleModel: vehicle.vehicleModel,
      number: vehicle.number ?? vehicle.vehicleNumber,
    };
  }

  if ("pickupOtp" in patch) {
    (next as Record<string, unknown>).pickupOtp = pickupOtp ?? "";
  }
  if ("dropOtp" in patch) {
    (next as Record<string, unknown>).dropOtp = dropOtp ?? "";
  }

  return next;
}

export function createBookingEventId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
