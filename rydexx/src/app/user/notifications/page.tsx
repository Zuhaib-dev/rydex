import type { Metadata } from "next";
import NotificationsPage from "./_page";

export const metadata: Metadata = {
  title: "Notifications | Rydex",
  description: "View all your Rydex notifications — booking updates, account alerts, and messages.",
  robots: { index: false, follow: false },
};

export default NotificationsPage;
