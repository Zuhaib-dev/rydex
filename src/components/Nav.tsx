"use client";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

function Nav() {
    const Nav_Items = ["Home","Bookings","About Us","Contact"]
    const pathName = usePathname()
  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`fixed top-3 left-1/2 -translate-x-1/2 w-[94%] md:w=[86%] z-50 rounded-full bg-[#0B0B0B] text-white shadow-[0_15px_50px_rgba(0,0,0,0,7)]py-3 `}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between ">
        <Image src={"/logo.png"} alt="logo" width={44} height={44} priority />
        <div>
        {Nav_Items.map((i,index)=>{
            const href = `/${i.toLowerCase()}`
            const isActive = href == pathName
            return <Link href={href} key={index} className={`text-sm font-medium transition pl-3 ${isActive ?"text-white ":"text-gray-400 hover:text-white" }`} >{i}</Link>
        })}
      </div>
      </div>
      
    </motion.div>
  );
}

export default Nav;
