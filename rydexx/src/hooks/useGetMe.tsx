"use client";
import { setUserData } from "@/redux/userSlice";
import axios from "axios";
import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";

function useGetMe(enabled: boolean) {
  const dispatch = useDispatch();
  const isImpersonating = useSelector((state: RootState) => state.user.isImpersonating);
  // Guard against double-invocation (React StrictMode / fast refresh)
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!enabled || isImpersonating) return;
    // Only fetch once per mount
    if (hasFetched.current) return;
    hasFetched.current = true;

    const controller = new AbortController();

    const getMe = async () => {
      try {
        const { data } = await axios.get("/api/user/me", {
          signal: controller.signal,
        });
        dispatch(setUserData(data.user));
      } catch (error: any) {
        if (axios.isCancel(error)) return; // Unmounted — ignore
        console.error("[useGetMe]", error?.response?.status, error?.message);
        if (error.response?.status === 404 || error.response?.status === 401) {
          import("next-auth/react").then(({ signOut }) => {
            signOut({ callbackUrl: "/" });
          });
        }
      }
    };

    getMe();

    return () => {
      controller.abort();
    };
  }, [enabled, isImpersonating, dispatch]);
}

export default useGetMe;
