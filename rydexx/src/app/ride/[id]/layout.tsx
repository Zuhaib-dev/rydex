import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function RideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  return children;
}
