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
import { PageHead, Panel } from "@/components/partner/shared";

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
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="p-8 text-center mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground flex items-center"><Loader2 className="animate-spin mr-2" size={16} />Loading Ledger...</div>
      </div>
    );
  }

  return (
    <>
      <Nav onAuthRequired={() => {}} />
      <div className="pt-28 pb-20 px-4 sm:px-8 max-w-5xl mx-auto space-y-6">
        <PageHead 
          code="USR / 03" 
          title="Digital Wallet" 
          subtitle="Manage your balance and transactions" 
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Balance & Topup */}
          <div className="lg:col-span-1 space-y-6">
            <Panel code="BAL / 01" title="Current Balance">
              <div className="p-6">
                <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">Available Funds</p>
                <div className="flex items-baseline gap-1 text-foreground">
                  <span className="text-2xl font-bold">₹</span>
                  <span className="text-5xl font-black tracking-tighter">{balance.toLocaleString()}</span>
                </div>
              </div>
            </Panel>

            <Panel code="TOP / 01" title="Add Funds">
              <div className="p-6 border-b border-border bg-secondary/5">
                <div className="grid grid-cols-3 gap-2 mb-6">
                  {[100, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setTopupAmount(amt.toString())}
                      className="py-3 bg-secondary/10 hover:bg-signal hover:text-background border border-border text-[11px] font-mono tracking-widest transition-colors uppercase"
                    >
                      +₹{amt}
                    </button>
                  ))}
                </div>

                <div className="relative mb-6">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-muted-foreground font-mono text-[11px]">₹</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    placeholder="AMOUNT"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    className="w-full bg-background border border-border focus:border-signal rounded-none py-4 pl-8 pr-4 text-sm font-mono tracking-widest text-foreground outline-none transition-colors uppercase"
                  />
                </div>

                <button
                  onClick={handleTopup}
                  disabled={isProcessing || !topupAmount}
                  className="brick w-full bg-foreground hover:bg-signal disabled:opacity-50 text-background font-mono text-[11px] tracking-[0.2em] uppercase py-4 flex items-center justify-center gap-2 transition-colors"
                >
                  {isProcessing ? (
                    <><Loader2 size={16} className="animate-spin" /> Processing</>
                  ) : (
                    <>Proceed to Pay <IndianRupee size={14} /></>
                  )}
                </button>
              </div>
            </Panel>
          </div>

          {/* Right Column: Transaction History */}
          <div className="lg:col-span-2">
            <Panel code="HST / 02" title="Transaction Log">
              {transactions.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 bg-secondary/10 border border-border flex items-center justify-center mb-4">
                    <AlertCircle size={20} className="text-muted-foreground" />
                  </div>
                  <h3 className="text-xs font-mono tracking-widest uppercase text-foreground mb-1">No Ledger Entries</h3>
                  <p className="text-muted-foreground text-[10px] font-mono tracking-widest uppercase max-w-xs">Transactions will appear here after wallet activity.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {transactions.slice().reverse().map((tx, idx) => {
                    const isCredit = tx.type === "credit";
                    return (
                      <div key={idx} className="flex items-center justify-between p-4 bg-background hover:bg-secondary/10 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 border flex items-center justify-center shrink-0 ${isCredit ? 'border-signal bg-signal/10 text-signal' : 'border-destructive bg-destructive/10 text-destructive'}`}>
                            {isCredit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                          </div>
                          <div>
                            <p className="font-bold text-foreground text-xs uppercase tracking-wider mb-0.5">{tx.reason}</p>
                            <p className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground">
                              {new Date(tx.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right pl-4">
                          <p className={`font-mono text-sm tracking-wider font-bold ${isCredit ? 'text-signal' : 'text-foreground'}`}>
                            {isCredit ? '+' : '-'}₹{tx.amount}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
          </div>
        </div>
      </div>
      <Foot />
    </>
  );
}