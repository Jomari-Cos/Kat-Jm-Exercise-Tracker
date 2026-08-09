export type UserType = 'JM' | 'KAT';

/** A geographic coordinate used for GPS route tracking. */
export interface LatLng {
  latitude: number;
  longitude: number;
}

export type ExerciseCategory = 
  | 'Cardio' 
  | 'Strength' 
  | 'Running' 
  | 'Walking' 
  | 'Cycling' 
  | 'HIIT' 
  | 'Yoga' 
  | 'Pilates' 
  | 'Gym Workout' 
  | 'Sports' 
  | 'Other';

export interface WorkoutLog {
  id: string;
  user: UserType;
  date: string; // YYYY-MM-DD
  timestamp: number; // Unix epoch ms
  exerciseType: ExerciseCategory;
  customName?: string;
  durationMins: number;
  caloriesBurned?: number;
  notes?: string;
  proofPhotoUrl?: string; // Base64 data URL or photo link
  aiFeedback?: string;
  mood?: string; // e.g. '🔥 On Fire', '💪 Strong', '💦 Sweaty', '🧘 Calm'
  location?: string;
  // Automatically tracked session metrics (steps + time + distance)
  steps?: number; // total steps counted from the device motion sensor
  distanceMeters?: number; // distance traveled (GPS when allowed, else steps × stride)
  startTime?: number; // Unix epoch ms when the activity started
  endTime?: number; // Unix epoch ms when the activity ended
  route?: LatLng[]; // GPS trace of the walked/running route
  mapProofUrl?: string; // base64 PNG screenshot of the route map (saved as proof)
}

export interface UserProfile {
  id: UserType;
  name: string;
  nickname: string;
  avatar: string;
  themeColor: string; // Tailwind color class or hex
  bgGradient: string;
  weeklyGoalMins: number;
  favExercise: ExerciseCategory;
  bio: string;
}

export interface UserStats {
  totalMins: number;
  totalWorkouts: number;
  currentStreak: number;
  bestStreak: number;
  thisWeekMins: number;
  thisMonthMins: number;
  avgDurationMins: number;
  loggedToday: boolean;
  todayLog?: WorkoutLog;
}
