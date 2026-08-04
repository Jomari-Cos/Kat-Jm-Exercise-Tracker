export type UserType = 'JM' | 'KAT';

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
