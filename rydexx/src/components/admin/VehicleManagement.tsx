"use client";

import { useState } from "react";
import { PageHead, Panel } from "@/components/partner/shared";
import { CommandSearch } from "@/components/admin/CommandSearch";
import { X, ExternalLink, ShieldCheck, ShieldAlert, FileText, User as UserIcon } from "lucide-react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function VehiclesDir() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [filter, setFilter] = useState("");
  const limit = 50;

  let url = `/api/admin/vehicles?page=${page}&limit=${limit}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (status) url += `&status=${status}`;
  if (filter) url += `&filter=${filter}`;

  const { data, isLoading, mutate } = useSWR(url, fetcher);
  
  const vehicles = data?.vehicles || [];
  const total = data?.pagination?.total || 0;

  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateStatus = async (vehicleId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/vehicles/${vehicleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error("Failed to update status");
      mutate();
      if (selectedVehicle && selectedVehicle._id === vehicleId) {
        setSelectedVehicle({ ...selectedVehicle, status: newStatus });
      }
    } catch (err) {
      alert("Error updating vehicle status");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHead 
        code="ADM / 05" 
        title="Vehicle Directory" 
        subtitle="Manage partner fleets, compliance documents, and platform verification" 
      />
      
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <CommandSearch 
            placeholder="Search by model, brand, or number plate..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select 
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="bg-background border border-border p-3 mono text-[11px] uppercase focus:outline-none focus:border-signal w-[200px]"
        >
          <option value="">All Statuses</option>
          <option value="approved">Approved</option>
          <option value="suspended">Suspended</option>
          <option value="pending">Pending</option>
        </select>
        <select 
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setPage(1); }}
          className="bg-background border border-border p-3 mono text-[11px] uppercase focus:outline-none focus:border-signal w-[200px]"
        >
          <option value="">Document Expiry</option>
          <option value="expiring">Expiring Soon</option>
          <option value="expired">Expired</option>
        </select>
      </div>
      
      <Panel code="VEH / 05" title="Fleet Ledger">
        <div className="overflow-x-auto">
          <table className="w-full mono text-[11px] text-left">
            <thead>
              <tr className="hairline-b text-muted-foreground tracking-[0.18em] uppercase text-[9px]">
                <th className="py-3 px-4 font-normal">Vehicle Details</th>
                <th className="py-3 px-4 font-normal">Owner Info</th>
                <th className="py-3 px-4 font-normal">Compliance Status</th>
                <th className="py-3 px-4 font-normal">Documents</th>
                <th className="py-3 px-4 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground uppercase tracking-widest text-[10px]">Loading vehicles...</td></tr>
              ) : vehicles.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground uppercase tracking-widest text-[10px]">No vehicles found</td></tr>
              ) : vehicles.map((v: any) => {
                const totalDocs = 5;
                const uploadedDocs = v.documents?.length || 0;
                const isApproved = v.status === "approved";
                
                return (
                  <tr key={v._id} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-4 px-4">
                      <div className="serif text-[15px] font-bold text-foreground mb-1">{v.vehicleModel || v.brand}</div>
                      <div className="mono text-[12px] text-signal uppercase mb-1">{v.vehicleNumber}</div>
                      <div className="text-muted-foreground lowercase">{v.type} &bull; {v.fuelType || "N/A"} &bull; {v.seatingCapacity || "N/A"} Seats</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-foreground mb-1 truncate max-w-[150px]">{v.owner?.name || "System"}</div>
                      <div className="text-muted-foreground mb-1 truncate max-w-[150px]">{v.owner?.email || "N/A"}</div>
                      <div className="text-muted-foreground">{v.owner?.mobileNumber || "N/A"}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 uppercase tracking-wider text-[9px] ${
                        isApproved ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : 
                        v.status === "suspended" ? "bg-red-500/10 text-red-500 border border-red-500/20" : 
                        "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
                      }`}>
                        {isApproved ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                        {v.status || "Pending"}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" />
                        {uploadedDocs} / {totalDocs} Uploaded
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex flex-col items-end gap-2">
                        <button 
                          onClick={() => setSelectedVehicle(v)}
                          className="px-4 py-1.5 border border-border hover:border-signal text-foreground hover:text-signal transition-colors uppercase tracking-widest text-[9px]"
                        >
                          View
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(v._id, isApproved ? "suspended" : "approved")}
                          disabled={isUpdating}
                          className={`px-4 py-1.5 border transition-colors uppercase tracking-widest text-[9px] ${
                            isApproved 
                              ? "border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white" 
                              : "border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white"
                          }`}
                        >
                          {isApproved ? "Suspend" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Vehicle Verification Modal */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card hairline w-full max-w-4xl shadow-2xl flex flex-col max-h-[95vh]">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-border bg-secondary/10 shrink-0">
              <div className="flex items-center gap-4">
                <h2 className="mono text-[14px] uppercase tracking-widest text-foreground font-bold">Vehicle Verification</h2>
                <span className={`px-2 py-0.5 uppercase tracking-widest text-[9px] border ${
                  selectedVehicle.status === "approved" ? "border-emerald-500 text-emerald-500" :
                  selectedVehicle.status === "suspended" ? "border-red-500 text-red-500" :
                  "border-yellow-500 text-yellow-500"
                }`}>
                  {selectedVehicle.status || "Pending"}
                </span>
              </div>
              <button onClick={() => setSelectedVehicle(null)} className="text-muted-foreground hover:text-signal transition-colors flex items-center gap-2 mono text-[10px] uppercase">
                <X className="h-4 w-4" /> Close
              </button>
            </div>
            
            {/* Body */}
            <div className="p-0 overflow-y-auto grid grid-cols-1 md:grid-cols-[1fr_350px] divide-y md:divide-y-0 md:divide-x divide-border">
              
              {/* Left Column: Details */}
              <div className="p-6 space-y-8">
                {/* Image */}
                <div>
                  <h3 className="mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3">Vehicle Registration Photo</h3>
                  <div className="w-full h-[250px] bg-secondary/20 border border-border flex items-center justify-center overflow-hidden">
                    {selectedVehicle.imageUrl ? (
                      <img src={selectedVehicle.imageUrl} alt="Vehicle" className="w-full h-full object-cover" />
                    ) : (
                      <span className="mono text-[10px] uppercase text-muted-foreground tracking-widest">No Image Available</span>
                    )}
                  </div>
                </div>

                {/* Specs */}
                <div>
                  <h3 className="mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3 pb-2 border-b border-border">Vehicle Specifications</h3>
                  <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                    <div>
                      <div className="mono text-[9px] text-muted-foreground uppercase tracking-widest mb-1">Make & Model</div>
                      <div className="serif text-[16px] text-foreground">{selectedVehicle.vehicleModel || selectedVehicle.brand}</div>
                    </div>
                    <div>
                      <div className="mono text-[9px] text-muted-foreground uppercase tracking-widest mb-1">Registration Plate</div>
                      <div className="mono text-[14px] text-signal uppercase">{selectedVehicle.vehicleNumber}</div>
                    </div>
                    <div>
                      <div className="mono text-[9px] text-muted-foreground uppercase tracking-widest mb-1">Manufacture Year</div>
                      <div className="mono text-[12px]">{selectedVehicle.manufacturingYear || "N/A"}</div>
                    </div>
                    <div>
                      <div className="mono text-[9px] text-muted-foreground uppercase tracking-widest mb-1">Fuel Type / Seats</div>
                      <div className="mono text-[12px] lowercase">{selectedVehicle.fuelType || "N/A"} &bull; {selectedVehicle.seatingCapacity || "N/A"} Seats</div>
                    </div>
                    <div>
                      <div className="mono text-[9px] text-muted-foreground uppercase tracking-widest mb-1">Base / Per Km Rates</div>
                      <div className="mono text-[12px]">₹{selectedVehicle.baseFare || 0} base &bull; ₹{selectedVehicle.perKmRate || 0}/km</div>
                    </div>
                    <div>
                      <div className="mono text-[9px] text-muted-foreground uppercase tracking-widest mb-1">Waiting Fees</div>
                      <div className="mono text-[12px]">₹{selectedVehicle.waitingCharge || 0}/min</div>
                    </div>
                  </div>
                </div>

                {/* Owner */}
                <div>
                  <h3 className="mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3 pb-2 border-b border-border">Driver Owner Information</h3>
                  <div className="flex items-center gap-4 bg-secondary/10 p-4 border border-border">
                    <div className="w-12 h-12 rounded-full bg-signal/20 text-signal flex items-center justify-center shrink-0 border border-signal/30 overflow-hidden">
                      {selectedVehicle.owner?.image ? (
                        <img src={selectedVehicle.owner.image} alt="Owner" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-foreground text-[14px]">{selectedVehicle.owner?.name || "System"}</div>
                      <div className="text-muted-foreground text-[12px]">{selectedVehicle.owner?.email || "N/A"}</div>
                      <div className="mono text-[11px] text-muted-foreground mt-1">{selectedVehicle.owner?.mobileNumber || "N/A"}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Documents */}
              <div className="p-6 bg-secondary/5">
                <h3 className="mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-4 flex items-center justify-between">
                  <span>Uploaded Documents</span>
                  <span className="text-signal">{selectedVehicle.documents?.length || 0}/5</span>
                </h3>
                
                <div className="space-y-4">
                  {selectedVehicle.documents?.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-border text-muted-foreground mono text-[10px] uppercase tracking-widest">
                      No documents uploaded yet
                    </div>
                  ) : (
                    selectedVehicle.documents?.map((doc: any, i: number) => {
                      const expiry = new Date(doc.expiryDate).toLocaleDateString("en-GB", { day: 'numeric', month: 'numeric', year: 'numeric' });
                      const isExpired = new Date(doc.expiryDate) < new Date();
                      
                      return (
                        <div key={i} className="border border-border bg-background p-4 relative group">
                          <div className="mb-3">
                            <div className="font-bold text-[13px] text-foreground flex items-center gap-2 uppercase">
                              {doc.documentType}
                              {isExpired && <span className="bg-red-500 text-white text-[8px] px-1.5 py-0.5 uppercase tracking-wider">Expired</span>}
                            </div>
                            <div className="mono text-[10px] text-muted-foreground mt-1 tracking-widest">
                              Expires: {expiry}
                            </div>
                          </div>
                          
                          <a 
                            href={doc.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 py-2 border border-signal text-signal hover:bg-signal hover:text-white transition-colors mono text-[10px] uppercase tracking-widest"
                          >
                            <ExternalLink className="w-3 h-3" /> View Document
                          </a>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-secondary/10 flex justify-between items-center shrink-0">
              <button 
                onClick={() => handleUpdateStatus(selectedVehicle._id, "rejected")}
                disabled={isUpdating}
                className="px-6 py-2.5 mono text-[11px] tracking-[0.2em] uppercase text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
              >
                Reject Information
              </button>
              <div className="flex gap-3">
                <button 
                  onClick={() => setSelectedVehicle(null)}
                  className="px-6 py-2.5 mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground border border-border hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleUpdateStatus(selectedVehicle._id, selectedVehicle.status === "approved" ? "suspended" : "approved")}
                  disabled={isUpdating}
                  className={`px-6 py-2.5 mono text-[11px] tracking-[0.2em] uppercase transition-colors disabled:opacity-50 ${
                    selectedVehicle.status === "approved" 
                      ? "bg-red-500 text-white hover:bg-red-600" 
                      : "bg-emerald-500 text-white hover:bg-emerald-600"
                  }`}
                >
                  {isUpdating ? "..." : selectedVehicle.status === "approved" ? "Suspend Partner" : "Activate Partner"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
