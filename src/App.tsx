import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, UserStats, UserType, WorkoutLog } from './types';
import {
  calculateUserStats,
  deleteWorkoutLog,
  getUserProfiles,
  addWorkoutLog,
  clearAllLogs,
  getAllLogs,
  saveUserProfile
} from './utils/storage';
import { HeaderTabNav } from './components/HeaderTabNav';
import { TodayTrackerForm } from './components/TodayTrackerForm';
import { HistoryList } from './components/HistoryList';
import { UserStatsSummary } from './components/UserStatsSummary';
import { Activity } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<UserType | 'BOTH'>('KAT');
  const [profiles, setProfiles] = useState<Record<UserType, UserProfile> | null>(null);
  const [allLogs, setAllLogs] = useState<WorkoutLog[]>([]);
  const [statsJM, setStatsJM] = useState<UserStats | null>(null);
  const [statsKAT, setStatsKAT] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshData = useCallback(async () => {
    setAllLogs(await getAllLogs());
    const [profilesData, sJM, sKAT] = await Promise.all([
      getUserProfiles(),
      calculateUserStats('JM'),
      calculateUserStats('KAT')
    ]);
    setProfiles(profilesData);
    setStatsJM(sJM);
    setStatsKAT(sKAT);
  }, []);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        await refreshData();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [refreshData]);

  const handleLogSubmit = async (logData: Omit<WorkoutLog, 'id' | 'timestamp'>) => {
    await addWorkoutLog(logData);
    await refreshData();
  };

  const handleDeleteLog = async (id: string) => {
    await deleteWorkoutLog(id);
    await refreshData();
  };

  const handleClearData = async () => {
    await clearAllLogs();
    await refreshData();
  };

  const handleSaveProfile = async (user: UserType, profile: UserProfile) => {
    await saveUserProfile(user, profile);
    await refreshData();
  };

  if (isLoading || !profiles || !statsJM || !statsKAT) {
    return (
      <div className="min-h-screen bg-slate-50/70 font-sans text-slate-900 flex flex-col items-center justify-center gap-4">
        <div className="flex -space-x-2">
          <div className="w-12 h-12 bg-pink-500 rounded-2xl flex items-center justify-center text-white font-black shadow-md shadow-pink-200 border-2 border-white z-10">
            <Activity className="w-6 h-6" />
          </div>
          <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white font-black shadow-md shadow-emerald-200 border-2 border-white">
            <Activity className="w-6 h-6" />
          </div>
        </div>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
          Loading workout data...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 font-sans text-slate-900 flex flex-col">
      {/* Header Navigation - White, Pink & Green */}
      <HeaderTabNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        profiles={profiles}
        statsJM={statsJM}
        statsKAT={statsKAT}
        onResetData={handleClearData}
        onSaveProfile={handleSaveProfile}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8">
        {activeTab === 'BOTH' ? (
          /* Dual Comparison View for Both Kat & Jm */
          <div className="space-y-8">
            {/* White + Pink & Green Banner */}
            <div className="bg-white border-2 border-slate-200/80 rounded-[32px] p-6 sm:p-8 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-pink-500" />
              <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500" />

              <div>
                <span className="text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                  Dual Fitness Dashboard
                </span>
                <h2 className="text-2xl sm:text-3xl font-black mt-2 text-slate-900">
                  <span className="text-pink-600">Kat</span> & <span className="text-emerald-600">Jm</span> Fitness Challenge 🔥
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-lg font-medium">
                  Track each other's daily active minutes, support streak goals, and attach photo proof every single day.
                </p>
              </div>

              {/* Quick totals badge */}
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="text-center px-3">
                  <p className="text-[11px] font-black text-pink-700 uppercase">KAT TOTAL</p>
                  <p className="text-2xl font-black text-pink-950">{statsKAT.totalMins}m</p>
                </div>
                <div className="w-px h-10 bg-slate-200" />
                <div className="text-center px-3">
                  <p className="text-[11px] font-black text-emerald-700 uppercase">JM TOTAL</p>
                  <p className="text-2xl font-black text-emerald-950">{statsJM.totalMins}m</p>
                </div>
              </div>
            </div>

            {/* Side by side columns: Kat first, Jm second */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* KAT COLUMN (Pink) */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b-2 border-pink-300 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-pink-500 shadow-sm" />
                    <h3 className="text-xl font-black text-pink-950 uppercase">Kat's Dashboard</h3>
                  </div>
                  <span className="text-xs font-black text-pink-800 bg-pink-100 px-3 py-1 rounded-full">
                    Goal: {profiles.KAT.weeklyGoalMins}m/wk
                  </span>
                </div>
                <UserStatsSummary user="KAT" profile={profiles.KAT} stats={statsKAT} />
                <TodayTrackerForm
                  user="KAT"
                  profile={profiles.KAT}
                  stats={statsKAT}
                  onLogSubmit={handleLogSubmit}
                />
                <HistoryList
                  user="KAT"
                  profiles={profiles}
                  logs={allLogs.filter(l => l.user === 'KAT')}
                  onDeleteLog={handleDeleteLog}
                />
              </div>

              {/* JM COLUMN (Green) */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b-2 border-emerald-300 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-500 shadow-sm" />
                    <h3 className="text-xl font-black text-emerald-950 uppercase">Jm's Dashboard</h3>
                  </div>
                  <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                    Goal: {profiles.JM.weeklyGoalMins}m/wk
                  </span>
                </div>
                <UserStatsSummary user="JM" profile={profiles.JM} stats={statsJM} />
                <TodayTrackerForm
                  user="JM"
                  profile={profiles.JM}
                  stats={statsJM}
                  onLogSubmit={handleLogSubmit}
                />
                <HistoryList
                  user="JM"
                  profiles={profiles}
                  logs={allLogs.filter(l => l.user === 'JM')}
                  onDeleteLog={handleDeleteLog}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Single User Layout with 3/5 and 2/5 columns */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column (3/5): Today's Input */}
            <section className="lg:col-span-7 flex flex-col gap-6">
              <TodayTrackerForm
                user={activeTab}
                profile={profiles[activeTab]}
                stats={activeTab === 'JM' ? statsJM : statsKAT}
                onLogSubmit={handleLogSubmit}
              />
            </section>

            {/* Right Column (2/5): Summary & History */}
            <section className="lg:col-span-5 flex flex-col gap-6">
              <UserStatsSummary
                user={activeTab}
                profile={profiles[activeTab]}
                stats={activeTab === 'JM' ? statsJM : statsKAT}
              />

              <HistoryList
                user={activeTab}
                profiles={profiles}
                logs={allLogs.filter(l => l.user === activeTab)}
                onDeleteLog={handleDeleteLog}
              />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}