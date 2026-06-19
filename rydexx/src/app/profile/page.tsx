"use client";

import { useSession, signOut } from "next-auth/react";
import { User, LogOut, Shield, Phone, Loader2, Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { OLA_MAPS_API_KEY } from "@/lib/mapConfig";
import { sortKashmirResultsFirst, KASHMIR_CENTER_LAT, KASHMIR_CENTER_LNG, KASHMIR_RADIUS_METERS } from "@/lib/kashmirBias";

export default function UserProfile() {
  const { data: session } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);

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
      <div className="flex justify-center py-20 min-h-screen bg-[#f4f5f7] items-center">
        <Loader2 className="animate-spin w-8 h-8 text-gray-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Profile</h1>
            <p className="text-gray-500 mt-1">Manage your personal account settings.</p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            Go Back
          </button>
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

              <h2 className="text-xl font-bold text-gray-900">{userData?.name || session?.user?.name || "Rider"}</h2>
              <p className="text-gray-500 text-sm mb-4">{userData?.email || session?.user?.email}</p>
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  Saved Places
                </h3>
                {!addingPlace && (
                  <button onClick={() => setAddingPlace(true)} className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                    + Add New
                  </button>
                )}
              </div>

              {addingPlace && (
                <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl mb-6">
                  <div className="flex gap-2 mb-3">
                    <select value={placeLabel} onChange={e => setPlaceLabel(e.target.value)} className="bg-white border border-zinc-200 text-sm font-semibold rounded-lg px-3 py-2 outline-none">
                      <option value="Home">Home</option>
                      <option value="Work">Work</option>
                      <option value="Other">Other</option>
                    </select>
                    {placeLabel === "Other" && (
                      <input type="text" placeholder="Custom label" className="flex-1 bg-white border border-zinc-200 text-sm font-semibold rounded-lg px-3 py-2 outline-none" onChange={e => setPlaceLabel(e.target.value)} />
                    )}
                  </div>
                  <div className="relative">
                    <input type="text" value={placeQuery} onChange={e => setPlaceQuery(e.target.value)} placeholder="Search address..." className="w-full bg-white border border-zinc-200 text-sm font-semibold rounded-lg px-3 py-2 outline-none focus:border-black" />
                    {placeResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-xl max-h-48 overflow-y-auto z-10 p-1">
                        {placeResults.map(p => (
                          <button key={p.id} onClick={() => handleSavePlace(p)} className="w-full text-left p-2 hover:bg-zinc-50 rounded-md flex flex-col gap-0.5">
                            <span className="text-xs font-bold text-zinc-900 truncate">{p.address.split(',')[0]}</span>
                            <span className="text-[10px] text-zinc-500 truncate">{p.address}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end mt-3">
                    <button onClick={() => { setAddingPlace(false); setPlaceQuery(""); }} className="text-xs font-semibold text-zinc-500 hover:text-zinc-700 px-3 py-1">Cancel</button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {savedPlaces.length === 0 && !addingPlace && (
                  <p className="text-sm text-zinc-500 text-center py-4">No places saved yet. Add home or work to book faster.</p>
                )}
                {savedPlaces.map((place, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 hover:border-zinc-200 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600">
                          {place.label.toLowerCase() === "home" ? <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path> : place.label.toLowerCase() === "work" ? <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect> : <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>}
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-zinc-900 truncate">{place.label}</p>
                        <p className="text-xs text-zinc-500 truncate">{place.address}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDeletePlace(place.label)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
