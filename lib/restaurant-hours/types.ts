import type { RestaurantHoursEvaluation } from "@/lib/restaurant-hours/core";

export type RestaurantWeeklyHour = {
  id: string;
  restaurant_id: string;
  day_of_week: number;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
  created_at: string;
  updated_at: string;
};

export type RestaurantHoursException = {
  id: string;
  restaurant_id: string;
  exception_date: string;
  label: string | null;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
  created_at: string;
  updated_at: string;
};

export type RestaurantHoursBundle = {
  profile: {
    timezone: string;
    temporarily_closed: boolean;
    temporarily_closed_reason: string | null;
  };
  weekly: RestaurantWeeklyHour[];
  exceptions: RestaurantHoursException[];
  evaluation: RestaurantHoursEvaluation;
};
