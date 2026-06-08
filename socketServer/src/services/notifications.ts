let ioInstance: any = null;
let adminMapNotifyTimer: NodeJS.Timeout | null = null;
let publicAvailabilityNotifyTimer: NodeJS.Timeout | null = null;

export function setIoForNotifications(io: any) {
  ioInstance = io;
}

export function notifyAdminMapThrottled() {
  if (!ioInstance) return;
  if (adminMapNotifyTimer) return;
  adminMapNotifyTimer = setTimeout(() => {
    ioInstance.to("admin-dashboard").emit("admin-dashboard-update", {
      scope: "map",
      reason: "location",
      at: Date.now(),
    });
    adminMapNotifyTimer = null;
  }, 1000);
}

export function notifyPublicAvailabilityThrottled(reason = "availability") {
  if (!ioInstance) return;
  if (publicAvailabilityNotifyTimer) return;
  publicAvailabilityNotifyTimer = setTimeout(() => {
    ioInstance.emit("driver-availability-updated", {
      reason,
      at: Date.now(),
    });
    publicAvailabilityNotifyTimer = null;
  }, 1000);
}
