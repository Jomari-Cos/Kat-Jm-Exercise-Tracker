import React from 'react';
import { UserProfile, UserStats, UserType } from '../types';
import { Flame, Trophy, Target, Award, Calendar, Zap, TrendingUp } from 'lucide-react';

interface StatsSummaryProps {
  activeTab: UserType | 'BOTH';
  profiles: Record<UserType, UserProfile>;
  statsJM: UserStats;
  statsKAT: UserStats;
}

export const StatsSummary: React.FC<StatsSummaryProps> = ({
  activeTab,
  profiles,
  statsJM,
  statsKAT
}) => {
  if (activeTab === 'BOTH') {
    // Dual Comparison View
    const jmGoalPercent = Math.min(100, Math.round((statsJM.thisWeekMins / profiles.JM.weeklyGoalMins) * 100));
    const katGoalPercent = Math.min(100, Math.round((statsKAT.thisWeekMins / profiles.KAT.weeklyGoalMins) * 100));

    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" /> Jm & Kat Fitness Leaderboard
            </h3>
            <p className="text-xs text-slate-500">
              Supporting each other day-to-day to reach active lifestyle goals
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            This Week
          </span>
        </div>

        {/* Side-by-Side Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* JM CARD */}
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src={profiles.JM.avatar}
                  alt="Jm"
                  className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500"
                />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Jm</h4>
                  <p className="text-xs text-emerald-800 font-medium">Goal: {profiles.JM.weeklyGoalMins}m / week</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-500 block">Streak</span>
                <span className="text-sm font-extrabold text-emerald-700 flex items-center gap-0.5">
                  <Flame className="w-4 h-4 fill-emerald-500 text-emerald-500" />
                  {statsJM.currentStreak} Days
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>{statsJM.thisWeekMins} mins logged</span>
                <span>{jmGoalPercent}%</span>
              </div>
              <div className="w-full h-3 bg-emerald-200/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${jmGoalPercent}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-emerald-200/60 text-xs">
              <div>
                <span className="text-slate-500 text-[10px] block">Total Mins</span>
                <span className="font-black text-slate-800">{statsJM.totalMins}m</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Workouts</span>
                <span className="font-black text-slate-800">{statsJM.totalWorkouts}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Best Streak</span>
                <span className="font-black text-slate-800">{statsJM.bestStreak}d</span>
              </div>
            </div>
          </div>

          {/* KAT CARD */}
          <div className="bg-pink-50/60 border border-pink-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src={profiles.KAT.avatar}
                  alt="Kat"
                  className="w-10 h-10 rounded-full object-cover border-2 border-pink-500"
                />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Kat</h4>
                  <p className="text-xs text-pink-800 font-medium">Goal: {profiles.KAT.weeklyGoalMins}m / week</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-500 block">Streak</span>
                <span className="text-sm font-extrabold text-pink-700 flex items-center gap-0.5">
                  <Flame className="w-4 h-4 fill-pink-500 text-pink-500" />
                  {statsKAT.currentStreak} Days
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>{statsKAT.thisWeekMins} mins logged</span>
                <span>{katGoalPercent}%</span>
              </div>
              <div className="w-full h-3 bg-pink-200/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-pink-600 rounded-full transition-all duration-500"
                  style={{ width: `${katGoalPercent}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-pink-200/60 text-xs">
              <div>
                <span className="text-slate-500 text-[10px] block">Total Mins</span>
                <span className="font-black text-slate-800">{statsKAT.totalMins}m</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Workouts</span>
                <span className="font-black text-slate-800">{statsKAT.totalWorkouts}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Best Streak</span>
                <span className="font-black text-slate-800">{statsKAT.bestStreak}d</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Single User Stats View
  const isJm = activeTab === 'JM';
  const profile = profiles[activeTab];
  const stats = isJm ? statsJM : statsKAT;

  const goalPercent = Math.min(100, Math.round((stats.thisWeekMins / profile.weeklyGoalMins) * 100));

  const themeText = isJm ? 'text-emerald-600' : 'text-pink-600';
  const themeProgressBg = isJm ? 'bg-emerald-600' : 'bg-pink-600';
  const themeLightBg = isJm ? 'bg-emerald-50 border-emerald-200' : 'bg-pink-50 border-pink-200';

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Target className={`w-5 h-5 ${themeText}`} />
            {profile.name}'s Weekly Goal Progress
          </h3>
          <p className="text-xs text-slate-500">
            Target: {profile.weeklyGoalMins} minutes active exercise per week
          </p>
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${themeLightBg} ${themeText}`}>
          {goalPercent}% Reached
        </span>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-bold text-slate-800">
          <span>{stats.thisWeekMins} / {profile.weeklyGoalMins} minutes this week</span>
          <span>{Math.max(0, profile.weeklyGoalMins - stats.thisWeekMins)} mins left</span>
        </div>
        <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
          <div
            className={`h-full ${themeProgressBg} rounded-full transition-all duration-500`}
            style={{ width: `${goalPercent}%` }}
          />
        </div>
      </div>

      {/* Stat Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block">Current Streak</span>
          <span className={`text-xl font-black ${themeText} flex items-center justify-center gap-1 mt-0.5`}>
            <Flame className="w-5 h-5 fill-current" />
            {stats.currentStreak} Days
          </span>
        </div>

        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block">Total Minutes</span>
          <span className="text-xl font-black text-slate-800 mt-0.5 block">
            {stats.totalMins} <span className="text-xs font-normal text-slate-500">mins</span>
          </span>
        </div>

        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block">Workouts Logged</span>
          <span className="text-xl font-black text-slate-800 mt-0.5 block">
            {stats.totalWorkouts}
          </span>
        </div>

        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block">Avg Duration</span>
          <span className="text-xl font-black text-slate-800 mt-0.5 block">
            {stats.avgDurationMins} <span className="text-xs font-normal text-slate-500">mins</span>
          </span>
        </div>
      </div>
    </div>
  );
};
