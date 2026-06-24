"use client";

import { useSession, signOut } from "next-auth/react";
import { User, LogOut, CheckCircle, Shield, Car, Phone, Loader2, Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { PageHead, Panel } from "@/components/partner/shared";

export default function PartnerProfile() {
  const { data: session } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [updatingPhone, setUpdatingPhone] = useState(false);
  const [currentVehicleIndex, setCurrentVehicleIndex] = useState(0);

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

  const vehicles = userData?.vehicles || (userData?.activeVehicle ? [userData.activeVehicle] : []);
  const currentVehicle = vehicles[currentVehicleIndex] || null;

  const handleUpdatePhone = async () => {
    if (!newPhone) return;
    
    const phoneRegex = /^\+?[1-9]\d{9,14}$/;
    if (!phoneRegex.test(newPhone.replace(/[\s-]/g, ''))) {
      alert("Please enter a valid phone number (e.g. +12345678901)");
      return;
    }

    try {
      setUpdatingPhone(true);
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobileNumber: newPhone }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUserData(data.user);
        setIsEditingPhone(false);
      } else {
        alert(data.message || "Failed to update phone");
      }
    } catch (err) {
      alert("Something went wrong");
    } finally {
      setUpdatingPhone(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert("Image size must be less than 3MB.");
      return;
    }

    setUploadingImage(true);

    try {
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

      const updateRes = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: uploadData.url }),
      });
      const updateData = await updateRes.json();

      if (!updateRes.ok) {
        throw new Error(updateData.message || "Failed to save profile picture");
      }

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
      <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-8">
        <PageHead code="PRT / 01" title="Operator Details" subtitle="Manage your account and vehicle details." />
        <Panel code="SYS / 02" title="Partner Profile">
          <div className="p-8 text-center mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground">
            Loading profile...
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHead 
          code="PRT / 01" 
          title="Operator Details" 
          subtitle="Manage your account and vehicle details." 
        />
        <button
          onClick={() => router.back()}
          className="brick px-4 py-2 font-mono text-[11px] tracking-[0.18em] uppercase hover:bg-signal transition-colors self-start sm:self-auto"
        >
          Go Back
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Panel code="PRT / 02" title="Identity">
            <div className="p-6 flex flex-col items-center text-center">
              <div className="relative group mb-6">
                <div className="w-24 h-24 rounded-none bg-secondary/50 flex items-center justify-center overflow-hidden border border-border relative">
                  {userData?.image ? (
                    <Image src={userData.image} alt="Profile" fill className="object-cover" />
                  ) : (
                    <User size={32} className="text-muted-foreground" />
                  )}
                  {uploadingImage && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                      <Loader2 className="animate-spin w-5 h-5 text-signal" />
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="absolute -bottom-2 -right-2 w-8 h-8 bg-signal flex items-center justify-center text-background hover:bg-signal/90 transition-colors z-20"
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

              <h2 className="font-bold text-foreground text-xl tracking-tight mb-1 uppercase">
                {userData?.name || session?.user?.name || "Driver"}
              </h2>
              <p className="mono text-[10px] tracking-widest text-muted-foreground uppercase break-all mb-4">
                {userData?.email || session?.user?.email}
              </p>
              
              {userData?.partnerStatus === "approved" && (
                <div className="inline-flex items-center gap-1.5 bg-signal/10 text-signal px-3 py-1 text-[10px] font-mono tracking-widest uppercase border border-signal/20">
                  <CheckCircle size={12} />
                  Verified Partner
                </div>
              )}
            </div>

            <div className="border-t border-border">
              <button
                onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                className="w-full flex items-center justify-center gap-2 bg-destructive/10 text-destructive hover:bg-destructive/20 py-4 font-mono text-[11px] tracking-[0.2em] uppercase transition-colors"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          </Panel>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Panel code="CFG / 01" title="Account Settings">
            <div className="divide-y divide-border">
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-muted-foreground" />
                  <div>
                    <p className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground">Phone Number</p>
                  </div>
                </div>
                {userData?.mobileNumber ? (
                  <p className="font-mono text-sm">{userData.mobileNumber}</p>
                ) : isEditingPhone ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. +1234567890"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="bg-background border border-border text-foreground font-mono text-[11px] uppercase px-3 py-1.5 outline-none focus:border-signal w-36"
                    />
                    <button
                      onClick={handleUpdatePhone}
                      disabled={updatingPhone}
                      className="bg-signal text-background font-mono text-[10px] tracking-[0.15em] uppercase px-3 py-1.5 hover:bg-signal/90 transition-colors disabled:opacity-50"
                    >
                      {updatingPhone ? "..." : "Save"}
                    </button>
                    <button
                      onClick={() => setIsEditingPhone(false)}
                      className="border border-border text-foreground font-mono text-[10px] tracking-[0.15em] uppercase px-3 py-1.5 hover:bg-secondary/50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingPhone(true)}
                    className="text-signal hover:text-signal/80 font-mono text-[10px] tracking-[0.18em] uppercase transition-colors"
                  >
                    + Add Phone
                  </button>
                )}
              </div>
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Shield size={16} className="text-muted-foreground" />
                  <div>
                    <p className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground">Language</p>
                  </div>
                </div>
                <p className="font-mono text-sm">English (US)</p>
              </div>
            </div>
          </Panel>

          <Panel code="VEH / 01" title="Vehicle Details">
            <div className="divide-y divide-border">
              {vehicles.length > 1 && (
                <div className="p-2 bg-secondary/30 flex items-center justify-between border-b border-border">
                  <button 
                    onClick={() => setCurrentVehicleIndex(prev => prev > 0 ? prev - 1 : vehicles.length - 1)}
                    className="p-2 hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
                  </button>
                  <div className="font-mono text-[10px] tracking-widest uppercase">
                    Vehicle {currentVehicleIndex + 1} of {vehicles.length}
                    {currentVehicle?._id === userData?.activeVehicleId && (
                      <span className="ml-2 text-signal">(Active)</span>
                    )}
                  </div>
                  <button 
                    onClick={() => setCurrentVehicleIndex(prev => prev < vehicles.length - 1 ? prev + 1 : 0)}
                    className="p-2 hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                </div>
              )}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Car size={16} className="text-muted-foreground" />
                  <div>
                    <p className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground">Vehicle Type</p>
                  </div>
                </div>
                <p className="font-mono text-sm uppercase">{currentVehicle?.type || "None"}</p>
              </div>
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-sm border border-muted-foreground flex items-center justify-center text-[8px] font-mono font-bold text-muted-foreground">LP</div>
                  <div>
                    <p className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground">License Plate</p>
                  </div>
                </div>
                <p className="font-mono text-sm uppercase">{currentVehicle?.vehicleNumber || "None"}</p>
              </div>
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                  <div>
                    <p className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground">Status</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${currentVehicle?.status === 'approved' ? 'bg-signal' : currentVehicle?.status === 'rejected' ? 'bg-destructive' : 'bg-yellow-500'}`}></span>
                  <p className="font-mono text-sm uppercase">{currentVehicle?.status || "Unknown"}</p>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
