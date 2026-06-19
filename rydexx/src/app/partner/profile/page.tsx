"use client";

import { useSession, signOut } from "next-auth/react";
import { User, LogOut, CheckCircle, Shield, Car, Phone, Loader2, Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";

export default function PartnerProfile() {
  const { data: session } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetch("/api/user/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUserData(data.user);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch user data:", err);
        setLoading(false);
      });
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (3MB limit)
    if (file.size > 3 * 1024 * 1024) {
      alert("Image size must be less than 3MB.");
      return;
    }

    setUploadingImage(true);

    try {
      // 1. Upload to ImageKit
      const formData = new FormData();
      formData.append("file", file);
      
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      
      if (!uploadRes.ok || !uploadData.url) {
        throw new Error(uploadData.message || "Upload failed");
      }

      // 2. Save URL to profile
      const updateRes = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: uploadData.url }),
      });
      const updateData = await updateRes.json();

      if (!updateRes.ok) {
        throw new Error(updateData.message || "Failed to save profile picture");
      }

      // 3. Update local state
      setUserData((prev: any) => ({ ...prev, image: uploadData.url }));
      
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Something went wrong uploading the image.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin w-8 h-8 text-gray-700" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Profile</h1>
        <p className="text-gray-500 mt-1">Manage your account and vehicle details.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col items-center text-center relative">
            
            {/* Profile Image Section */}
            <div className="relative group mb-4">
              <div className="w-24 h-24 rounded-full bg-zinc-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm relative">
                {userData?.image ? (
                  <Image src={userData.image} alt="Profile" fill className="object-cover" />
                ) : (
                  <User size={40} className="text-zinc-400" />
                )}
                
                {/* Overlay for uploading */}
                {uploadingImage && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10">
                    <Loader2 className="animate-spin w-6 h-6 text-zinc-900" />
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="absolute bottom-0 right-0 w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center text-white border-2 border-white shadow-sm hover:bg-zinc-800 transition-colors z-20"
                title="Upload Picture"
              >
                <Camera size={14} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/jpeg,image/png,image/webp,image/jpg" 
                className="hidden" 
              />
            </div>

            <h2 className="text-xl font-bold text-gray-900">{userData?.name || session?.user?.name || "Driver"}</h2>
            <p className="text-gray-500 text-sm mb-4">{userData?.email || session?.user?.email}</p>
            
            {userData?.partnerStatus === "approved" && (
              <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100">
                <CheckCircle size={14} />
                Verified Partner
              </div>
            )}
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
                <div className="flex items-center gap-3">
                  <Phone size={18} className="text-gray-400" />
                  <div>
                    <p className="font-semibold text-gray-900">Phone Number</p>
                    <p className="text-sm text-gray-500">{userData?.mobileNumber || "Not provided"}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <div>
                  <p className="font-semibold text-gray-900">Language</p>
                  <p className="text-sm text-gray-500">English (US)</p>
                </div>
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
                  <p className="text-sm text-gray-500 uppercase">{userData?.activeVehicle?.type || "None"}</p>
                </div>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <div>
                  <p className="font-semibold text-gray-900">License Plate</p>
                  <p className="text-sm text-gray-500 uppercase">{userData?.activeVehicle?.vehicleNumber || "None"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
