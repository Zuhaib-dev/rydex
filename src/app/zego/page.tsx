"use client";
import { useRef } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";

export default function Page() {
  const { userData } = useSelector((state: RootState) => state.user);
  const containerRef = useRef<HTMLDivElement>(null);

  const startCall = async () => {
    if (!containerRef.current) return;

    try {
      const { ZegoUIKitPrebuilt } = await import("@zegocloud/zego-uikit-prebuilt");
      
      const appId = Number(process.env.NEXT_PUBLIC_ZEGO_APP_ID);
      const serverSecret = process.env.NEXT_PUBLIC_ZEGO_SERVER_SECRET;

      if (!appId || !serverSecret) {
         console.error("Missing Zego environment variables!");
         return;
      }

      const userID = userData?._id?.toString() || Math.random().toString(36).substring(7);
      const userName = userData?.name || `Guest-${userID}`;

      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
        appId,
        serverSecret,
        "room1",
        userID,
        userName
      );

      const zp = ZegoUIKitPrebuilt.create(kitToken);
      zp.joinRoom({
        container: containerRef.current,
        scenario: {
          mode: ZegoUIKitPrebuilt.OneONoneCall, 
        },
      });
    } catch (error) {
      console.error("Zego Error:", error);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full items-center p-4">
      <button 
        onClick={startCall} 
        className="mb-4 px-6 py-2 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition"
      >
        Start Video Call
      </button>
      <div ref={containerRef} className="w-full flex-1 border border-gray-200 rounded-xl overflow-hidden" />
    </div>
  );
}
