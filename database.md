# Database Structure Documentation

This document outlines the data model, storage strategy, collections, schemas, and persistence utilities for the **Kat & Jm Workout Tracker** application.

---

## 1. Overview & Storage Architecture

The application utilizes a client-side persistent storage architecture powered by **Browser `localStorage`**, combined with seed data initialization and server-side **Gemini 2.5 Flash AI** analysis integration.

- **Primary Storage Engine:** Browser `localStorage` (JSON-encoded)
- **Data Collections / Keys:**
  - `jm_kat_exercise_logs_v1` - Array of workout log entries for both users.
  - `jm_kat_user_profiles_v1` - Object storing profile settings and preferences for `JM` and `KAT`.
- **Backend API Integration:** `/api/ai-motivation` (Express endpoint communicating with Gemini API for workout image & text feedback).

---

## 2. Primary Entities & Schemas

### 2.1 `WorkoutLog`

Represents an individual workout entry submitted by either `JM` or `KAT`.

| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `id` | `string` | Yes | Unique identifier (e.g., `log-1722800000000-a1b2c`) |
| `user` | `'JM' \| 'KAT'` | Yes | Identifier of the user who performed the workout |
| `date` | `string` | Yes | Date of exercise formatted as `YYYY-MM-DD` |
| `timestamp` | `number` | Yes | Unix epoch timestamp in milliseconds when created/logged |
| `exerciseType` | `ExerciseCategory` | Yes | Primary workout category (see allowed values below) |
| `customName` | `string` | No | Optional custom exercise label or workout name |
| `durationMins` | `number` | Yes | Total workout duration in minutes (positive integer) |
| `caloriesBurned` | `number` | No | Estimated calories burned |
| `steps` | `number` | No | Total steps automatically counted from the device motion sensor |
| `distanceMeters` | `number` | No | Distance traveled in meters (GPS when allowed, otherwise estimated from steps × stride) |
| `startTime` | `number` | No | Unix epoch ms when the activity started (auto-tracked) |
| `endTime` | `number` | No | Unix epoch ms when the activity ended (auto-tracked) |

| `notes` | `string` | No | Personal notes, performance stats, PRs, or description |
| `proofPhotoUrl` | `string` | No | Base64 data URL or photo link attached as workout proof |
| `aiFeedback` | `string` | No | AI-generated motivational cheer or feedback message |
| `mood` | `string` | No | Workout mood tag (e.g., `'🔥 On Fire'`, `'💪 Strong'`, `'💦 Sweaty'`, `'🧘 Calm'`) |
| `location` | `string` | No | Exercise location (e.g., `'Gym'`, `'Home'`, `'Outdoors'`) |

#### `ExerciseCategory` Allowed Values:
- `'Cardio'`
- `'Strength'`
- `'Running'`
- `'Walking'`
- `'Cycling'`
- `'HIIT'`
- `'Yoga'`
- `'Pilates'`
- `'Gym Workout'`
- `'Sports'`
- `'Other'`

---

### 2.2 `UserProfile`

Represents custom profile metadata, goals, and visual theme configurations for each user.

| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `id` | `'JM' \| 'KAT'` | Yes | Primary user key |
| `name` | `string` | Yes | Full display name (e.g. `'Jm'`, `'Kat'`) |
| `nickname` | `string` | Yes | Preferred short nickname |
| `avatar` | `string` | Yes | Avatar image URL |
| `themeColor` | `string` | Yes | Theme accent color name (e.g., `'teal'`, `'rose'`) |
| `bgGradient` | `string` | Yes | Tailwind gradient class string |
| `weeklyGoalMins` | `number` | Yes | Target total workout duration per week (in minutes) |
| `favExercise` | `ExerciseCategory` | Yes | Favorite exercise type |
| `bio` | `string` | Yes | Short personal motto or bio |

---

### 2.3 `UserStats` (Computed View Model)

Dynamically computed from `WorkoutLog[]` entries for a given user.

| Field | Type | Description |
| :--- | :--- | :--- |
| `totalMins` | `number` | Lifetime cumulative workout minutes |
| `totalWorkouts` | `number` | Total number of logged workouts |
| `currentStreak` | `number` | Consecutive daily active streak count |
| `bestStreak` | `number` | Longest historical daily streak count |
| `thisWeekMins` | `number` | Cumulative workout minutes logged during the current week |
| `thisMonthMins` | `number` | Cumulative workout minutes logged during the current month |
| `avgDurationMins` | `number` | Average workout duration in minutes |
| `loggedToday` | `boolean` | Flag indicating whether a workout was logged on the current date |
| `todayLog` | `WorkoutLog \| undefined` | The workout entry logged today, if available |

---

## 3. Storage Data Layout (`localStorage`)

### Key: `jm_kat_exercise_logs_v1`
```json
[
  {
    "id": "log-1722800000000-x9a2b",
    "user": "JM",
    "date": "2026-08-04",
    "timestamp": 1770192000000,
    "exerciseType": "Strength",
    "customName": "Upper Body & Core Gym Session",
    "durationMins": 45,
    "caloriesBurned": 320,
    "notes": "Hit personal record on bench press today!",
    "mood": "🔥 On Fire",
    "location": "Downtown Fitness Center",
    "proofPhotoUrl": "data:image/svg+xml;utf8,...",
    "aiFeedback": "🔥 Incredible work hitting a new bench press record, Jm!"
  }
]
```

### Key: `jm_kat_user_profiles_v1`
```json
{
  "JM": {
    "id": "JM",
    "name": "Jm",
    "nickname": "Jm",
    "avatar": "/avatars/jm.png",
    "themeColor": "teal",
    "bgGradient": "from-teal-500 to-emerald-600",
    "weeklyGoalMins": 180,
    "favExercise": "Strength",
    "bio": "Pushing limits day by day 💪"
  },
  "KAT": {
    "id": "KAT",
    "name": "Kat",
    "nickname": "Kat",
    "avatar": "/avatars/kat.png",
    "themeColor": "rose",
    "bgGradient": "from-rose-500 to-pink-600",
    "weeklyGoalMins": 150,
    "favExercise": "Pilates",
    "bio": "Consistency > Intensity ✨"
  }
}
```

---

## 4. Data Access Layer (`src/utils/storage.ts`)

The application provides a centralized data layer for querying and updating records:

- `getAllLogs(): WorkoutLog[]` — Retrieves all workout logs from `localStorage`, seeding defaults if empty.
- `getLogsForUser(user: UserType): WorkoutLog[]` — Fetches logs filtered by user, sorted chronologically descending.
- `addWorkoutLog(logData: Omit<WorkoutLog, 'id' | 'timestamp'>): WorkoutLog` — Inserts a new workout record.
- `updateWorkoutLog(updatedLog: WorkoutLog): void` — Updates an existing log entry by `id`.
- `deleteWorkoutLog(id: string): void` — Removes a workout log entry by `id`.
- `getUserProfiles(): Record<UserType, UserProfile>` — Retrieves profile configurations.
- `saveUserProfile(user: UserType, profile: UserProfile): void` — Updates a user profile.
- `calculateUserStats(user: UserType): UserStats` — Calculates aggregate statistics, active streak counts, and goal metrics.
- `resetToDefaults(): void` — Restores initial seed dataset for both users.

---

## 5. Server API Payload (`/api/ai-motivation`)

### Request Payload (`POST /api/ai-motivation`)
```json
{
  "user": "JM",
  "exerciseType": "Strength",
  "durationMins": 45,
  "notes": "Hit personal record on bench press today!",
  "imageBase64": "data:image/jpeg;base64,..."
}
```

### Response Payload
```json
{
  "success": true,
  "feedback": "🔥 Fantastic job hitting that new bench press PR, Jm! 45 minutes of dedicated lifting is building serious power."
}
```

