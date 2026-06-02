import { useState } from "react";
import { Send, Users, User, Bell } from "lucide-react";
import toast from "react-hot-toast";

export default function SendNotification() {
  const [target, setTarget] = useState<"all" | "users" | "partners" | "specific">("all");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required");
      return;
    }
    
    if (target === "specific" && !email.trim()) {
      toast.error("Email is required for specific target");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, email, title, message }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to send notification");
      }
      
      toast.success(data.message || "Notification sent successfully");
      setTitle("");
      setMessage("");
      if (target === "specific") setEmail("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-[24px] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black uppercase tracking-tight text-gray-900">
            <Bell className="text-black" size={24} />
            Send Broadcast Notification
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Push real-time notifications to users and partners. They will see a toast alert immediately if online, and can view it in their notification bell later.
          </p>
        </div>

        <form onSubmit={handleSend} className="mt-8 space-y-6">
          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Recipient Target
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { id: "all", label: "Everyone", icon: Users },
                { id: "users", label: "All Users", icon: User },
                { id: "partners", label: "All Partners", icon: User },
                { id: "specific", label: "Specific User", icon: Send },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTarget(opt.id as any)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                    target === opt.id
                      ? "border-black bg-black text-white shadow-md"
                      : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-white"
                  }`}
                >
                  <opt.icon size={20} />
                  <span className="text-[11px] font-bold uppercase tracking-wide">
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {target === "specific" && (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                User Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium transition focus:border-black focus:bg-white focus:outline-none focus:ring-1 focus:ring-black"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Notification Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. System Update or Promo Offer"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium transition focus:border-black focus:bg-white focus:outline-none focus:ring-1 focus:ring-black"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Message Body
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter the notification details here..."
              rows={4}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium transition focus:border-black focus:bg-white focus:outline-none focus:ring-1 focus:ring-black"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-black px-6 py-4 text-sm font-bold uppercase tracking-widest text-white shadow-lg shadow-black/20 transition hover:scale-[1.01] hover:bg-gray-900 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                Sending...
              </span>
            ) : (
              <>
                <Send size={18} />
                Send Notification
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
