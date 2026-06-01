"use client";
import { setUserData } from "@/redux/userSlice";
import axios from "axios";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";

function useGetMe(enabled:boolean) {
    const dispatch = useDispatch();
    const isImpersonating = useSelector((state: RootState) => state.user.isImpersonating);
    
    useEffect(() => {
      if(!enabled || isImpersonating){ return }
      const getMe = async () => {
        try {
          const { data } = await axios.get("/api/user/me");
          dispatch(setUserData(data.user));
        } catch (error: any) {
          console.log(error);
          if (error.response?.status === 404 || error.response?.status === 401) {
            import("next-auth/react").then(({ signOut }) => {
              signOut({ callbackUrl: "/signin" });
            });
          }
        }
      };
      getMe();
    }, [enabled, isImpersonating, dispatch]);
}

export default useGetMe;
