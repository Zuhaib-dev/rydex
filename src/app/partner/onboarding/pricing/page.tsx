import React from "react";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-4xl p-8 shadow-sm border border-gray-100 text-center space-y-6">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Pricing Setup</h1>
        <p className="text-gray-500 text-sm">
          Your Video KYC has been approved! Now you can set up your pricing details.
        </p>
        <div className="pt-4">
           {/* Add your pricing form or configuration here */}
           <div className="p-10 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center text-gray-400 font-bold uppercase tracking-widest text-xs">
              Coming Soon
           </div>
        </div>
      </div>
    </div>
  );
}
