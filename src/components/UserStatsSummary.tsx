import React from 'react';
import { UserProfile, UserStats, UserType } from '../types';
import { Flame, Trophy, Activity, Target } from 'lucide-react';

interface UserStatsSummaryProps {
  user: UserType;
  profile: UserProfile;
  stats: UserStats;
}

export const UserStatsSummary: React.FC<UserStatsSummaryProps> = ({
  user,
  profile,
  stats
}) => {
  const isJm = user === 'JM';
  const goalProgress = Math.min(100, Math.round((stats.thisWeekMins / profile.weeklyGoalMins) * 100));

  const mainColorClass = isJm ? 'text-emerald-600' : 'text-pink-600';
  const bgBadgeClass = isJm ? 'bg-emerald-100 text-emerald-800' : 'bg-pink-100 text-pink-800';
  const progressBgClass = isJm ? 'bg-emerald-500 shadow-sm shadow-emerald-300' : 'bg-pink-500 shadow-sm shadow-pink-300';
  const ringColorClass = isJm ? 'border-emerald-500' : 'border-pink-500';
  const cardBorderClass = isJm ? 'border-emerald-200' : 'border-pink-200';

  return (
    <div className={`bg-white border-2 ${cardBorderClass} p-6 sm:p-7 rounded-[32px] shadow-xl shadow-slate-200/50 relative overflow-hidden flex flex-col justify-between space-y-5`}>
      {/* Background glow accent */}
      <div className={`absolute -right-10 -bottom-10 w-36 h-36 rounded-full blur-3xl pointer-events-none ${isJm ? 'bg-emerald-400/20' : 'bg-pink-400/20'}`} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className={`text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${bgBadgeClass}`}>
            {profile.name}'s Weekly Goal
          </span>
          <h4 className="text-3xl font-black mt-2 text-slate-900">
            {stats.thisWeekMins}{' '}
            <span className="text-base text-slate-400 font-bold">/ {profile.weeklyGoalMins} MINS</span>
          </h4>
        </div>

        {/* Goal Circle Progress */}
        <div className={`w-16 h-16 rounded-2xl border-4 ${ringColorClass} flex flex-col items-center justify-center bg-slate-50 shadow-inner`}>
          <span className={`text-base font-black ${mainColorClass}`}>{goalProgress}%</span>
          <span className="text-[9px] font-bold text-slate-400 uppercase">DONE</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-200">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressBgClass}`}
            style={{ width: `${goalProgress}%` }}
          />
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-3 gap-2.5 pt-1">
        <div className={`p-3 rounded-2xl border text-center ${isJm ? 'bg-emerald-50/60 border-emerald-100' : 'bg-pink-50/60 border-pink-100'}`}>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1">
            <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" /> Streak
          </p>
          <p className="text-xl font-black mt-0.5 text-slate-900">{stats.currentStreak}d</p>
        </div>

        <div className={`p-3 rounded-2xl border text-center ${isJm ? 'bg-emerald-50/60 border-emerald-100' : 'bg-pink-50/60 border-pink-100'}`}>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-amber-500" /> Best
          </p>
          <p className="text-xl font-black mt-0.5 text-slate-900">{stats.bestStreak}d</p>
        </div>

        <div className={`p-3 rounded-2xl border text-center ${isJm ? 'bg-emerald-50/60 border-emerald-100' : 'bg-pink-50/60 border-pink-100'}`}>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1">
            <Activity className="w-3.5 h-3.5 text-teal-600" /> Total
          </p>
          <p className="text-xl font-black mt-0.5 text-slate-900">{stats.totalMins}m</p>
        </div>
      </div>
    </div>
  );
};
