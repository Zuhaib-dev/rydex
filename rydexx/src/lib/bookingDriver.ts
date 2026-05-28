/** Resolve driver id whether booking.driver is populated or an ObjectId */
export function getBookingDriverId(driver: unknown): string {
  if (!driver) return "";
  if (typeof driver === "string") return driver;
  if (typeof driver === "object" && driver !== null && "_id" in driver) {
    return String((driver as { _id: unknown })._id);
  }
  return String(driver);
}
