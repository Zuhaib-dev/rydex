import { z } from "zod";

export const nearbyVehiclesSchema = z.object({
  latitude: z.number().min(-90, "Latitude must be between -90 and 90").max(90, "Latitude must be between -90 and 90"),
  longitude: z.number().min(-180, "Longitude must be between -180 and 180").max(180, "Longitude must be between -180 and 180"),
  vehicleType: z.string().max(50, "Vehicle type is too long").optional(),
});
