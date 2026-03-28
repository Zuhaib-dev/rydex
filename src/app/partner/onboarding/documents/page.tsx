"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import axios from "axios";
import { ArrowLeft, ChevronRight, UploadCloud, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface DocumentState {
  file: File | null;
  status: "idle" | "uploading" | "done";
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] as const },
});

// Reusable card component
const DocumentCard = ({
  title,
  sub,
  state,
  inputRef,
  delay,
  onChange,
}: {
  title: string;
  sub: string;
  state: DocumentState;
  inputRef: React.RefObject<HTMLInputElement | null>;
  delay: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
  return (
    <motion.div {...fadeUp(delay)} className="relative group">
      <input
        type="file"
        ref={inputRef}
        onChange={onChange}
        className="hidden"
        accept="image/*,.pdf"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={state.status === "uploading"}
        className={`w-full text-left flex items-center justify-between p-5 rounded-[20px] transition-all duration-300 border ${
          state.status === "done"
            ? "bg-green-50/50 border-green-200"
            : "bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-sm"
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-300 ${
              state.status === "done" ? "bg-green-100 text-green-600" : "bg-zinc-100 text-zinc-900"
            }`}
          >
            {state.status === "done" ? <CheckCircle2 size={24} /> : <UploadCloud size={24} />}
          </div>
          <div>
            <p className="font-bold text-zinc-900 text-[15px]">{title}</p>
            <p className="text-[11px] text-zinc-400 mt-0.5 font-medium">{sub}</p>
          </div>
        </div>

        <div className="shrink-0 flex items-center">
          {state.status === "idle" && (
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-zinc-900 transition-colors">
              Upload
            </span>
          )}
          {state.status === "uploading" && (
            <div className="w-5 h-5 rounded-full border-2 border-zinc-200 border-t-zinc-900 animate-spin" />
          )}
          {state.status === "done" && (
            <span className="text-[11px] font-bold uppercase tracking-widest text-green-600">
              Added
            </span>
          )}
        </div>
      </button>
    </motion.div>
  );
};

export default function DocumentsPage() {
  const router = useRouter();

  // Document states
  const [rc, setRc] = useState<DocumentState>({ file: null, status: "idle" });
  const [license, setLicense] = useState<DocumentState>({ file: null, status: "idle" });
  const [aadhar, setAadhar] = useState<DocumentState>({ file: null, status: "idle" });
  const [loading, setLoading] = useState(false);

  // Refs for hidden inputs
  const rcRef = useRef<HTMLInputElement>(null);
  const licenseRef = useRef<HTMLInputElement>(null);
  const aadharRef = useRef<HTMLInputElement>(null);

  // Can continue if all three documents are marked "done"
  const canContinue = rc.status === "done" && license.status === "done" && aadhar.status === "done" && !loading;

  // Mock upload simulation visually
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setState: React.Dispatch<React.SetStateAction<DocumentState>>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Set to uploading immediately
    setState({ file, status: "uploading" });

    // 2. Simulate network delay then set to done visually
    setTimeout(() => {
      setState({ file, status: "done" });
    }, 800);
  };

  const handleContinue = async () => {
    if (!canContinue) return;
    setLoading(true);
    
    try {
      const formData = new FormData();
      if (rc.file) formData.append("rc", rc.file);
      if (license.file) formData.append("drivingLicense", license.file);
      if (aadhar.file) formData.append("aadhar", aadhar.file);

      await axios.post("/api/partner/onboarding/documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      router.push("/partner/onboarding/bank");
    } catch (error) {
      console.error("Error submitting documents:", error);
      alert("Failed to upload documents. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center py-10 px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] as const }}
        className="w-full max-w-lg bg-white rounded-3xl shadow-sm border border-zinc-100 overflow-hidden"
      >
        {/* Header */}
        <div className="relative flex flex-col items-center pt-8 pb-5 px-6 border-b border-zinc-100">
          <button
            onClick={() => router.back()}
            className="absolute left-5 top-7 w-9 h-9 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <ArrowLeft size={16} strokeWidth={2} />
          </button>
          <motion.p {...fadeUp(0.05)} className="text-xs text-zinc-400 font-medium mb-1">
            step 2 of 3
          </motion.p>
          <motion.h1 {...fadeUp(0.1)} className="text-2xl font-black text-zinc-900 tracking-tight">
            Upload Documents
          </motion.h1>
          <motion.p {...fadeUp(0.15)} className="text-sm text-zinc-400 mt-1">
            We need this to verify your profile
          </motion.p>
        </div>

        <div className="px-6 py-7 space-y-4">
          <DocumentCard
            title="RC Book"
            sub="Vehicle Registration Certificate"
            state={rc}
            inputRef={rcRef}
            delay={0.18}
            onChange={(e) => handleFileChange(e, setRc)}
          />

          <DocumentCard
            title="Driving License"
            sub="Front & Back scanned copy"
            state={license}
            inputRef={licenseRef}
            delay={0.24}
            onChange={(e) => handleFileChange(e, setLicense)}
          />

          <DocumentCard
            title="Aadhar Card"
            sub="Identity Proof"
            state={aadhar}
            inputRef={aadharRef}
            delay={0.3}
            onChange={(e) => handleFileChange(e, setAadhar)}
          />
        </div>

        {/* Manual Verification Info */}
        <motion.div {...fadeUp(0.36)} className="px-6 pb-4">
          <div className="flex items-start gap-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <AlertCircle size={18} className="text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900">Manual Verification</p>
              <p className="text-[11px] text-blue-700 mt-1 leading-relaxed">
                Your submitted documents will be manually verified by our team. Approval usually takes 24-48 hours. Ensure all details are clear and readable.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Continue button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42, duration: 0.35 }}
          className="px-6 pb-8"
        >
          <motion.button
            onClick={handleContinue}
            whileTap={{ scale: 0.98 }}
            disabled={!canContinue}
            className={`w-full py-4 rounded-2xl text-sm font-bold tracking-wide flex items-center justify-center gap-2 transition-all duration-200 ${
              canContinue
                ? "bg-zinc-900 text-white shadow-lg shadow-zinc-900/20 hover:bg-zinc-800"
                : "bg-zinc-100 text-zinc-300 cursor-not-allowed"
            }`}
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                Continue
                {canContinue && <ChevronRight size={16} strokeWidth={2.5} />}
              </>
            )}
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}