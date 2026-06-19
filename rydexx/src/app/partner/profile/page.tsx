"use client";

import { useSession, signOut } from "next-auth/react";
import { User, LogOut, CheckCircle, Shield, Car, Phone } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PartnerProfile() {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Profile</h1>
        <p className="text-gray-500 mt-1">Manage your account and vehicle details.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
              <User size={40} className="text-zinc-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{session?.user?.name || "Driver"}</h2>
            <p className="text-gray-500 text-sm mb-4">{session?.user?.email}</p>
            
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100">
              <CheckCircle size={14} />
              Verified Partner
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              className="w-full flex items-center justify-center gap-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 py-3 rounded-xl font-bold transition-colors shadow-sm"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield size={20} className="text-blue-500" />
              Account Settings
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <div>
                  <p className="font-semibold text-gray-900">Phone Number</p>
                  <p className="text-sm text-gray-500">+91 98765 43210</p>
                </div>
                <button className="text-sm font-bold text-blue-600">Edit</button>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <div>
                  <p className="font-semibold text-gray-900">Language</p>
                  <p className="text-sm text-gray-500">English (US)</p>
                </div>
                <button className="text-sm font-bold text-blue-600">Edit</button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Car size={20} className="text-purple-500" />
              Vehicle Details
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <div>
                  <p className="font-semibold text-gray-900">Vehicle Type</p>
                  <p className="text-sm text-gray-500 uppercase">Auto</p>
                </div>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <div>
                  <p className="font-semibold text-gray-900">License Plate</p>
                  <p className="text-sm text-gray-500 uppercase">JK01 AB 1234</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
