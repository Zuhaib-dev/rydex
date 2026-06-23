"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  IndianRupee,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useRouter } from "next/navigation";
import Nav from "@/components/landing/sections/Nav";
import Foot from "@/components/landing/sections/Foot";

export default function WalletPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [topupAmount, setTopupAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      const res = await fetch("/api/wallet/balance");
      const data = await res.json();
      if (data.success) {
        setBalance(data.balance);
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error("Failed to fetch wallet data", error);
    } finally {
      setLoading(false);
    }
  };

  function loadRazorpayScript() {
    return new Promise((resolve) => {
      if (typeof window === "undefined") return resolve(false);
      if ((window as any).Razorpay) return resolve(true);

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  const handleTopup = async () => {
    const amount = Number(topupAmount);
    if (!amount || amount < 1) {
      alert("Please enter a valid amount (Minimum ₹1)");
      return;
    }

    setIsProcessing(true);
    try {
      const razorpayLoaded = await loadRazorpayScript();
      if (!razorpayLoaded) {
        alert("Razorpay SDK failed to load");
        setIsProcessing(false);
        return;
      }

      const res = await fetch("/api/wallet/topup/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      const orderData = await res.json();
      if (orderData.error) throw new Error(orderData.error);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY,
        amount: orderData.amount,
        currency: "INR",
        name: "RYDEX",
        description: "Wallet Top-up",
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch("/api/wallet/topup/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                amount: amount,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            
            if (verifyData.success) {
              setTopupAmount("");
              await fetchWalletData(); // Refresh UI
            } else {
              alert(verifyData.error || "Payment verification failed");
            }
          } catch (err) {
            console.error(err);
            alert("Verification failed");
          }
        },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.on("payment.failed", function (response: any) {
        alert("Payment Failed. Reason: " + response.error.description);
      });
      paymentObject.open();

    } catch (err: any) {
      console.error(err);
      alert(err.message || "Something went wrong");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-zinc-900 w-8 h-8" />
      </div>
    );
  }

  return (
    <>
      <Nav onAuthRequired={() => {}} />
      <div className="min-h-screen bg-[#fafafa] pt-28 pb-20 px-4 sm:px-6 relative">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, #d4d4d8 1px, transparent 1px)", backgroundSize: "28px 28px", opacity: 0.45 }} />

        <div className="max-w-4xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Balance & Topup */}
          <div className="lg:col-span-1 space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900 rounded-4xl p-8 text-white shadow-xl relative overflow-hidden"
            >
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-zinc-800 rounded-full blur-3xl opacity-50" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
                    <Wallet size={18} className="text-white" />
                  </div>
                  <span className="font-semibold tracking-wide text-white/80">Rydex Wallet</span>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-white/50 mb-2">Available Balance</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-white/60">₹</span>
                    <span className="text-5xl font-black tracking-tight">{balance.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-4xl p-6 border border-zinc-200 shadow-sm"
            >
              <h3 className="text-lg font-black text-zinc-900 mb-4 flex items-center gap-2">
                <Plus size={18} /> Add Money
              </h3>
              
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[100, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setTopupAmount(amt.toString())}
                    className="py-3 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-700 transition-colors"
                  >
                    +₹{amt}
                  </button>
                ))}
              </div>

              <div className="relative mb-6">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-zinc-500 font-bold">₹</span>
                </div>
                <input
                  type="number"
                  min="1"
                  placeholder="Enter amount"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  className="w-full bg-white border-2 border-zinc-200 focus:border-zinc-900 rounded-2xl py-4 pl-8 pr-4 text-lg font-black text-zinc-900 outline-none transition-colors"
                />
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleTopup}
                disabled={isProcessing || !topupAmount}
                className="w-full bg-zinc-900 hover:bg-black disabled:opacity-50 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-md transition-colors"
              >
                {isProcessing ? (
                  <><Loader2 size={18} className="animate-spin" /> Processing...</>
                ) : (
                  <>Proceed to Pay <IndianRupee size={16} /></>
                )}
              </motion.button>
            </motion.div>
          </div>

          {/* Right Column: Transaction History */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-4xl p-6 sm:p-8 border border-zinc-200 shadow-sm min-h-full"
            >
              <h2 className="text-2xl font-black text-zinc-900 mb-6 flex items-center gap-3">
                <Clock size={24} className="text-zinc-400" /> Transaction History
              </h2>

              {transactions.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
                    <AlertCircle size={24} className="text-zinc-400" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 mb-1">No transactions yet</h3>
                  <p className="text-zinc-500 text-sm max-w-xs">Your wallet history will appear here once you top up or take a ride.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.slice().reverse().map((tx, idx) => {
                    const isCredit = tx.type === "credit";
                    return (
                      <div key={idx} className="flex items-center justify-between p-4 rounded-2xl border border-zinc-100 bg-zinc-50 hover:bg-zinc-100/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isCredit ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                            {isCredit ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                          </div>
                          <div>
                            <p className="font-bold text-zinc-900 text-sm sm:text-base mb-0.5">{tx.reason}</p>
                            <p className="text-xs text-zinc-500 font-medium">
                              {new Date(tx.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right pl-4">
                          <p className={`font-black text-lg ${isCredit ? 'text-emerald-600' : 'text-zinc-900'}`}>
                            {isCredit ? '+' : '-'}₹{tx.amount}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>

        </div>
      </div>
      <Foot />
    </>
  );
}
