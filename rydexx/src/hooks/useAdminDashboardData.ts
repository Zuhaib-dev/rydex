"use client";

import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAdminRealtimeRefresh } from "./useAdminRealtime";

export interface PartnerReview {
  _id: string;
  name: string;
  email: string;
  vehicleType?: string;
}

export interface VehicleReview {
  _id: string;
  vehicleModel: string;
  vehicleNumber: string;
  type: string;
  owner?: {
    name: string;
    email: string;
  };
}

export interface AdminDashboardData {
  totalPartners: number;
  totalApprovedPartners: number;
  totalRejectedPartners: number;
  totalPendingPartners: number;
  onlinePartners: number;
  activeRides: number;
  activeSos: number;
  grossRevenue24h?: number;
  pendingPartnerReviews: PartnerReview[];
  pendingVehicleReviews: VehicleReview[];
  pendingVideoKYC: PartnerReview[];
}

export function useAdminDashboardData() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const fetchData = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? hasLoadedRef.current;
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const response = await axios.get<AdminDashboardData>("/api/admin/dashboard");
      setData(response.data);
      setError(null);
      hasLoadedRef.current = true;
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Could not load dashboard data. Will retry on next update.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useAdminRealtimeRefresh("dashboard", () => fetchData({ silent: true }));

  return {
    data,
    loading,
    refreshing,
    error,
    refetch: () => fetchData({ silent: hasLoadedRef.current }),
  };
}
