// Shared types for all PartnerAnalyticsHub tab components

export type TabType =
  | "overview"
  | "demand"
  | "operations"
  | "fleet"
  | "drivers"
  | "analytics"
  | "settlements"
  | "goals";

export type TimeframeType = "daily" | "weekly" | "monthly";
export type DashboardMode = "solo" | "fleet";

export interface ChartItem {
  date: string;
  earnings: number;
  ridesCount: number;
}

export interface AnalyticsData {
  summary: {
    totalEarnings: number;
    totalRides: number;
    stripePayouts: number;
    cashCollected: number;
    pendingCommission: number;
    totalDistanceKm: number;
  };
  fuel: {
    vehicleType: string;
    efficiency: number;
    fuelType: string;
    pricePerUnit: number;
    consumed: number;
    estimatedCost: number;
    netProfit: number;
  };
  streaks: {
    currentStreak: number;
    ridesToday: number;
    dailyGoal: number;
    dailyGoalBonus: number;
    dailyGoalAchieved: boolean;
  };
  charts: {
    daily: ChartItem[];
    weekly: ChartItem[];
    monthly: ChartItem[];
  };
}

export interface FleetVehicle {
  id: string;
  number: string;
  type: string;
  fuelType: "EV" | "CNG" | "Petrol";
  level: number;
  status: "On Job" | "Available" | "Charging" | "Service";
  driver: string;
  speed: number;
}

export interface FleetDriver {
  id: string;
  name: string;
  status: "Active" | "Idle" | "Offline";
  rating: number;
  safetyScore: number;
  earnings: number;
  coaching: string;
}

export interface LiveBooking {
  id: string;
  pickup: string;
  drop: string;
  status: "Requested" | "In Progress" | "Completed";
  driver: string | null;
  fare: number;
  passengers?: number;
  notes?: string;
}
