"use client";

import { useSession, signOut } from "next-auth/react";
import { User, LogOut, Shield, Phone, Loader2, Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { OLA_MAPS_API_KEY } from "@/lib/mapConfig";
import { sortKashmirResultsFirst, KASHMIR_CENTER_LAT, KASHMIR_CENTER_LNG, KASHMIR_RADIUS_METERS } from "@/lib/kashmirBias";
import { PageHead, Panel } from "@/components/partner/shared";

export default function UserProfile() {
  const { data: session } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [updatingPhone, setUpdatingPhone] = useState(false);

  // Saved Places state
  const [savedPlaces, setSavedPlaces] = useState<any[]>([]);
  const [addingPlace, setAddingPlace] = useState(false);
  const [placeLabel, setPlaceLabel] = useState("Home");
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState<any[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUserData(data.user);
          setSavedPlaces(data.user.savedPlaces || []);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch user data:", err);
        setLoading(false);
      });
  }, []);

  const handleUpdatePhone = async () => {
    if (!newPhone) return;
    
    // Basic E.164 phone number validation (optional +, followed by 10-15 digits)
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

  const searchAddress = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setPlaceResults([]);
      setSearchError(null);
      return;
    }
    if (!OLA_MAPS_API_KEY) return;

    try {
      setSearchError(null);
      const url = new URL(`https://api.olamaps.io/places/v1/autocomplete`);
      url.searchParams.append("input", query.trim());
      url.searchParams.append("api_key", OLA_MAPS_API_KEY);
      url.searchParams.append("location", `${KASHMIR_CENTER_LAT},${KASHMIR_CENTER_LNG}`);
      url.searchParams.append("radius", String(KASHMIR_RADIUS_METERS));

      const res = await fetch(url.toString(), { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      if (!data.predictions || data.predictions.length === 0) {
        setPlaceResults([]);
        setSearchError("No results found.");
        return;
      }
      const results = data.predictions.map((f: any) => ({
        id: f.place_id,
        address: f.description,
        lat: f.geometry?.location?.lat || 0,
        lng: f.geometry?.location?.lng || 0,
      }));
      setPlaceResults(sortKashmirResultsFirst(results));
    } catch (error) {
      setSearchError("Failed to fetch suggestions.");
      setPlaceResults([]);
    }
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => searchAddress(placeQuery), 300);
    return () => clearTimeout(handler);
  }, [placeQuery, searchAddress]);

  const handleSavePlace = async (p: any) => {
    try {
      const res = await fetch("/api/user/saved-places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: placeLabel, address: p.address, lat: p.lat, lng: p.lng })
      });
      const data = await res.json();
      if (res.ok) {
        setSavedPlaces(data.savedPlaces);
        setAddingPlace(false);
        setPlaceQuery("");
        setPlaceLabel("Home");
      } else {
        alert(data.message || "Failed to save place");
      }
    } catch (err) {
      alert("Something went wrong");
    }
  };

  const handleDeletePlace = async (label: string) => {
    try {
      const res = await fetch("/api/user/saved-places", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label })
      });
      const data = await res.json();
      if (res.ok) setSavedPlaces(data.savedPlaces);
    } catch (err) {
      alert("Failed to delete");
    }
  };

    if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-8">
        <PageHead code="USR / 01" title="Profile Details" subtitle="Manage your personal account settings." />
        <Panel code="SYS / 02" title="User Profile">
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
          code="USR / 01" 
          title="Profile Details" 
          subtitle="Manage your personal account settings." 
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
          <Panel code="USR / 02" title="Identity">
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
                {userData?.name || session?.user?.name || "Rider"}
              </h2>
              <p className="mono text-[10px] tracking-widest text-muted-foreground uppercase break-all">
                {userData?.email || session?.user?.email}
              </p>
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

          {userData?.role !== "admin" && (
          <Panel code="LOC / 01" title="Saved Places">
            <div className="p-4 border-b border-border bg-secondary/20 flex items-center justify-between">
              <div className="mono text-[10px] tracking-[0.15em] text-muted-foreground uppercase">
                Locations: {savedPlaces.length}
              </div>
              {!addingPlace && (
                <button 
                  onClick={() => setAddingPlace(true)} 
                  className="text-signal hover:text-signal/80 font-mono text-[10px] tracking-[0.18em] uppercase transition-colors"
                >
                  + Add New
                </button>
              )}
            </div>

            {addingPlace && (
              <div className="p-4 border-b border-border bg-secondary/10">
                <div className="flex gap-2 mb-3">
                  <select 
                    value={placeLabel} 
                    onChange={e => setPlaceLabel(e.target.value)} 
                    className="bg-background border border-border text-foreground font-mono text-[11px] uppercase tracking-wider px-3 py-2 outline-none focus:border-signal"
                  >
                    <option value="Home">Home</option>
                    <option value="Work">Work</option>
                    <option value="Other">Other</option>
                  </select>
                  {placeLabel === "Other" && (
                    <input 
                      type="text" 
                      placeholder="Custom label" 
                      className="flex-1 bg-background border border-border text-foreground font-mono text-[11px] uppercase px-3 py-2 outline-none focus:border-signal placeholder:text-muted-foreground" 
                      onChange={e => setPlaceLabel(e.target.value)} 
                    />
                  )}
                </div>
                <div className="relative">
                  <input 
                    type="text" 
                    value={placeQuery} 
                    onChange={e => setPlaceQuery(e.target.value)} 
                    placeholder="Search address..." 
                    className="w-full bg-background border border-border text-foreground font-mono text-[11px] px-3 py-2 outline-none focus:border-signal placeholder:text-muted-foreground" 
                  />
                  {placeResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-background border border-border shadow-xl max-h-48 overflow-y-auto z-10 p-1">
                      {placeResults.map(p => (
                        <button key={p.id} onClick={() => handleSavePlace(p)} className="w-full text-left p-2 hover:bg-secondary/50 flex flex-col gap-1 border-b border-border/50 last:border-0">
                          <span className="font-bold text-foreground text-sm truncate">{p.address.split(',')[0]}</span>
                          <span className="font-mono text-[9px] tracking-wider text-muted-foreground uppercase truncate">{p.address}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-end mt-3">
                  <button 
                    onClick={() => { setAddingPlace(false); setPlaceQuery(""); }} 
                    className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground px-3 py-1 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="divide-y divide-border">
              {savedPlaces.length === 0 && !addingPlace && (
                <div className="p-8 text-center mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground">
                  No places saved yet.
                </div>
              )}
              {savedPlaces.map((place, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors group">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 bg-secondary flex items-center justify-center shrink-0 border border-border">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground group-hover:text-signal transition-colors">
                        {place.label.toLowerCase() === "home" ? <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path> : place.label.toLowerCase() === "work" ? <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect> : <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>}
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground uppercase tracking-wider text-sm truncate">{place.label}</p>
                      <p className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase mt-1 truncate">{place.address}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeletePlace(place.label)} 
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                  </button>
                </div>
              ))}
            </div>
          </Panel>
        )}
        </div>
      </div>
    </div>
  );
}
