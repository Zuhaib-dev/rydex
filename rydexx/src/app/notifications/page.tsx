import type { Metadata } from "next";
import NotificationsPage from "./NotificationsClient";

export const metadata: Metadata = {
  title: "Notifications | Rydex",
  description: "View all your Rydex notifications — booking updates, account alerts, and messages.",
  robots: { index: false, follow: false },
};

export default NotificationsPage;
