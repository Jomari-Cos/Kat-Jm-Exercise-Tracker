import React from 'react';
import { UserProfile, UserStats, UserType } from '../types';
import { Target, Award } from 'lucide-react';

interface ProfileGoalCardProps {
  user: UserType;
  profile: UserProfile;
  stats: UserStats;
}

export const ProfileGoalCard: React.FC<ProfileGoalCardProps> = ({
  user,
  profile,
  stats
}) => {
  const isJm = user === 'JM';
  const goalProgress = Math.min(100, Math.round((stats.thisWeekMins / profile.weeklyGoalMins) * 100));
  const minsLeft = Math.max(0, profile.weeklyGoalMins - stats.thisWeekMins);

  const mainColorClass = isJm ? 'text-emerald-600' : 'text-pink-600';
  const headingColorClass = isJm ? 'text-emerald-950' : 'text-pink-950';
  const bgBadgeClass = isJm ? 'bg-emerald-100 text-emerald-800' : 'bg-pink-100 text-pink-800';
  const progressBgClass = isJm ? 'bg-emerald-500 shadow-sm shadow-emerald-300' : 'bg-pink-500 shadow-sm shadow-pink-300';
  const cardBorderClass = isJm ? 'border-emerald-200' : 'border-pink-200';
  const glowBgClass = isJm ? 'bg-emerald-400/20' : 'bg-pink-400/20';
  const gradientClass = isJm ? 'from-emerald-500 to-teal-600' : 'from-rose-500 to-pink-600';

  return (
    <div className={`bg-white border-2 ${cardBorderClass} p-6 sm:p-7 rounded-[32px] shadow-xl shadow-slate-200/50 relative overflow-hidden`}>
      {/* Background glow accent */}
      <div className={`absolute -right-10 -top-10 w-36 h-36 rounded-full blur-3xl pointer-events-none ${glowBgClass}`} />

      {/* Profile header: avatar + identity */}
      <div className="flex items-start gap-4">
        <div className={`w-16 h-16 rounded-full p-0.5 bg-gradient-to-br ${gradientClass} shrink-0`}>
          <img
            src={profile.avatar}
            alt={profile.name}
            className="w-full h-full rounded-full object-cover border-2 border-white"
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`text-lg font-black uppercase ${headingColorClass}`}>
              {profile.name}'s Profile
            </h3>
            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${bgBadgeClass}`}>
              {profile.favExercise}
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1 italic">
            "{profile.bio}"
          </p>
          <p className="text-[11px] font-bold text-slate-400 mt-0.5 uppercase tracking-wide">
            Nickname: {profile.nickname}
          </p>
        </div>
      </div>

      {/* Weekly goal numbers */}
      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Weekly Goal
          </span>
          <p className="text-2xl font-black text-slate-900 mt-0.5">
            {stats.thisWeekMins}{' '}
            <span className="text-sm text-slate-400 font-bold">/ {profile.weeklyGoalMins} MINS</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Target className={`w-4 h-4 ${mainColorClass}`} />
          <span className={`text-sm font-black ${mainColorClass}`}>{goalProgress}%</span>
        </div>
      </div>

      {/* Goal progress bar */}
      <div className="mt-2.5">
        <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-200">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressBgClass}`}
            style={{ width: `${goalProgress}%` }}
          />
        </div>
        <p className="text-[11px] font-semibold text-slate-500 mt-1.5 flex items-center gap-1">
          {minsLeft > 0 ? (
            <>
              <Award className={`w-3.5 h-3.5 ${mainColorClass}`} />
              {minsLeft} mins left to reach this week's goal
            </>
          ) : (
            <>
              <Award className="w-3.5 h-3.5 text-amber-500" />
              Weekly goal reached — amazing! 🔥
            </>
          )}
        </p>
      </div>
    </div>
  );
};
