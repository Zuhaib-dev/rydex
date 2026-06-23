
"use client";

import { PageHead, Panel } from "@/components/partner/shared";
import { CommandSearch } from "@/components/admin/CommandSearch";
import { useState, useRef } from "react";
import useSWR from "swr";
import { Plus, X, Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function VehiclesDir() {
  const [page, setPage] = useState(1);
  const { data, isLoading, mutate } = useSWR(`/api/admin/vehicles?page=${page}&limit=50`, fetcher);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: "Bike",
    fuelType: "Petrol",
    brand: "",
    modelName: "",
    registrationPlate: "",
    color: "",
    mfgYear: "",
    seats: "",
    baseFare: "",
    perKmRate: "",
    waitingFees: "",
  });
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const vehicles = data?.vehicles || [];
  const total = data?.pagination?.total || 0;

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    // Optimistic UI could be here
    await fetch(`/api/admin/vehicles/${id}/active`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !currentActive }),
    });
    mutate();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be smaller than 2MB");
      return;
    }
    
    // Validate type
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file");
      return;
    }
    
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) {
      alert("Please upload a vehicle image");
      return;
    }
    
    setIsSubmitting(true);
    try {
      // 1. Upload image first
      const formDataUpload = new FormData();
      formDataUpload.append("file", imageFile);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formDataUpload,
      });
      const uploadData = await uploadRes.json();
      
      if (!uploadData.url) throw new Error("Image upload failed");
      
      // 2. Create vehicle
      const vehiclePayload = {
        ...formData,
        vehicleImage: uploadData.url,
        mfgYear: parseInt(formData.mfgYear),
        seats: parseInt(formData.seats),
        baseFare: parseFloat(formData.baseFare),
        perKmRate: parseFloat(formData.perKmRate),
        waitingFees: parseFloat(formData.waitingFees),
      };
      
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vehiclePayload),
      });
      
      if (!res.ok) throw new Error("Failed to create vehicle");
      
      setIsModalOpen(false);
      mutate();
    } catch (err: any) {
      alert(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHead code="ADM / 05" title="Vehicle Directory" subtitle={`${isLoading ? "..." : total} fleet units · indexed live`} />
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-black text-white px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition shadow-sm"
        >
          <Plus size={18} /> Add New Vehicle
        </button>
      </div>
      
      <CommandSearch placeholder="search_vehicle_or_plate" />
      
      <Panel code="VEH / 05" title="Fleet Ledger">
        <div className="overflow-x-auto">
          <table className="w-full mono text-[11px]">
            <thead>
              <tr className="hairline-b text-left text-muted-foreground tracking-[0.18em] uppercase text-[9px]">
                <th className="py-2 px-2">VEH_ID</th><th className="py-2 px-2">Plate</th><th className="py-2 px-2">Model</th><th className="py-2 px-2">Type</th><th className="py-2 px-2">Owner</th><th className="py-2 px-2">Action</th><th className="py-2 px-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Loading fleet...</td></tr>
              ) : vehicles.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No vehicles found.</td></tr>
              ) : vehicles.map((v: any) => (
                <tr key={v._id} className="hover:bg-ink hover:text-bone transition-colors group">
                  <td className="py-2.5 px-2 text-signal">VEH-{v._id.substring(v._id.length - 4).toUpperCase()}</td>
                  <td className="py-2.5 px-2">{v.registrationPlate || v.vehicleNumber}</td>
                  <td className="py-2.5 px-2 serif text-[14px]">{v.modelName || v.vehicleModel}</td>
                  <td className="py-2.5 px-2">{v.type}</td>
                  <td className="py-2.5 px-2 truncate max-w-[120px]">{v.owner?.name || "System"}</td>
                  <td className="py-2.5 px-2">
                    <button 
                      onClick={() => handleToggleActive(v._id, v.isActive)}
                      className="px-2 py-1 hairline hover:bg-bone hover:text-ink transition-colors text-[9px] tracking-[0.1em]"
                    >
                      {v.isActive ? "DEACTIVATE" : "ACTIVATE"}
                    </button>
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    <span className={`mono text-[9px] tracking-[0.22em] px-1.5 py-0.5 ${
                      !v.isActive ? "bg-signal text-bone" : "hairline group-hover:border-bone"
                    }`}>{v.isActive ? "ACTIVE" : "INACTIVE"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Add New Vehicle Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="mono text-[10px] tracking-[0.22em] uppercase bg-black text-white px-2 py-0.5">MODAL / 01</span>
                  </div>
                  <h2 className="text-2xl font-black mt-1">Add New Vehicle</h2>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddVehicle} className="p-6 space-y-6">
                
                {/* Image Upload Section */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-gray-500">Vehicle Image (Max 2MB)</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${imagePreview ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-black hover:bg-gray-50'}`}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleImageChange}
                      accept="image/*"
                      className="hidden" 
                    />
                    {imagePreview ? (
                      <div className="relative w-full max-w-[200px] aspect-video rounded-xl overflow-hidden shadow-sm">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-white text-xs font-bold bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm">Change Image</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-gray-400">
                        <Upload size={32} className="mb-3" />
                        <span className="text-sm font-bold text-gray-600">Click to upload vehicle photo</span>
                        <span className="text-xs mt-1">PNG, JPG, WEBP up to 2MB</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-wider text-gray-500">Vehicle Type</label>
                    <select required value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm font-semibold">
                      <option value="Bike">Bike</option>
                      <option value="Auto">Auto</option>
                      <option value="Car">Car</option>
                      <option value="Sedan">Sedan</option>
                      <option value="SUV">SUV</option>
                      <option value="Van">Van</option>
                      <option value="Truck">Truck</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-wider text-gray-500">Fuel Type</label>
                    <select required value={formData.fuelType} onChange={e => setFormData({...formData, fuelType: e.target.value})} className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm font-semibold">
                      <option value="Petrol">Petrol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Electric">Electric</option>
                      <option value="CNG">CNG</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-wider text-gray-500">Brand / Make</label>
                    <input required type="text" placeholder="e.g. Maruti Suzuki" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm font-semibold placeholder:font-medium placeholder:text-gray-400" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-wider text-gray-500">Model Name</label>
                    <input required type="text" placeholder="e.g. Swift Dzire" value={formData.modelName} onChange={e => setFormData({...formData, modelName: e.target.value})} className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm font-semibold placeholder:font-medium placeholder:text-gray-400" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-wider text-gray-500">Registration Plate</label>
                    <input required type="text" placeholder="e.g. MH12AB1234" value={formData.registrationPlate} onChange={e => setFormData({...formData, registrationPlate: e.target.value})} className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm font-semibold placeholder:font-medium placeholder:text-gray-400 uppercase" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-wider text-gray-500">Color</label>
                    <input required type="text" placeholder="e.g. White" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm font-semibold placeholder:font-medium placeholder:text-gray-400" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-wider text-gray-500">Mfg Year</label>
                    <input required type="number" placeholder="2026" min="1990" max="2028" value={formData.mfgYear} onChange={e => setFormData({...formData, mfgYear: e.target.value})} className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm font-semibold placeholder:font-medium placeholder:text-gray-400" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-wider text-gray-500">Seats</label>
                    <input required type="number" placeholder="4" min="1" max="50" value={formData.seats} onChange={e => setFormData({...formData, seats: e.target.value})} className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm font-semibold placeholder:font-medium placeholder:text-gray-400" />
                  </div>
                  
                  <div className="col-span-1 md:col-span-2 pt-4 border-t border-gray-100">
                    <h3 className="text-sm font-black uppercase tracking-wider mb-4">Pricing Configuration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-wider text-gray-500">Base Fare (₹)</label>
                        <input required type="number" placeholder="50" min="0" value={formData.baseFare} onChange={e => setFormData({...formData, baseFare: e.target.value})} className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm font-semibold placeholder:font-medium placeholder:text-gray-400" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-wider text-gray-500">Per KM Rate (₹)</label>
                        <input required type="number" placeholder="15" min="0" value={formData.perKmRate} onChange={e => setFormData({...formData, perKmRate: e.target.value})} className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm font-semibold placeholder:font-medium placeholder:text-gray-400" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-wider text-gray-500">Waiting Fees (₹/m)</label>
                        <input required type="number" placeholder="2" min="0" value={formData.waitingFees} onChange={e => setFormData({...formData, waitingFees: e.target.value})} className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm font-semibold placeholder:font-medium placeholder:text-gray-400" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">
                    Cancel
                  </button>
                  <button disabled={isSubmitting} type="submit" className="bg-black text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2">
                    {isSubmitting && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {isSubmitting ? "Uploading..." : "Publish Vehicle"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
