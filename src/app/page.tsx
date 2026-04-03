"use client"
import Footer from "@/components/Footer";
import Nav from "@/components/Nav";
import PublicHome from "@/components/PublicHome";
import { useSession } from "next-auth/react";
export default function Home() {
  const session = useSession()
  return (
    
         <div className="w-full min-h-screen bg-white ">
          <Nav />
          <PublicHome />
          <Footer />
         </div>
  );
}
