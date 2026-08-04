import React, { useState } from 'react';
import { UserProfile, UserStats, UserType } from '../types';
import { Flame, Activity, RefreshCw, Settings2, Cloud, CloudOff } from 'lucide-react';
import { UserProfileModal } from './UserProfileModal';
import type { SyncStatus } from '../utils/storage';

interface HeaderTabNavProps {
  activeTab: UserType | 'BOTH';
  onTabChange: (tab: UserType | 'BOTH') => void;
  profiles: Record<UserType, UserProfile>;
  statsJM: UserStats;
  statsKAT: UserStats;
  syncStatus?: SyncStatus | null;
  onResetData?: () => void;
  onSaveProfile?: (user: UserType, profile: UserProfile) => Promise<void> | void;
}

export const HeaderTabNav: React.FC<HeaderTabNavProps> = ({
  activeTab,
  onTabChange,
  profiles,
  statsJM,
  statsKAT,
  syncStatus,
  onResetData,
  onSaveProfile
}) => {
  const [profileModalUser, setProfileModalUser] = useState<UserType | null>(null);
  const [showSyncTooltip, setShowSyncTooltip] = useState(false);

  const currentActiveStreak =
    activeTab === 'JM'
      ? statsJM.currentStreak
      : activeTab === 'KAT'
        ? statsKAT.currentStreak
        : Math.max(statsJM.currentStreak, statsKAT.currentStreak);

  return (
    <header className="px-4 sm:px-8 py-4 bg-white border-b-2 border-pink-100/80 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-40 shadow-xs">
      {/* Brand logo & title - Pink & Green theme */}
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          <div className="w-10 h-10 bg-pink-500 rounded-2xl flex items-center justify-center text-white font-black shadow-md shadow-pink-200 border-2 border-white z-10">
            <Activity className="w-6 h-6" />
          </div>
          <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white font-black shadow-md shadow-emerald-200 border-2 border-white">
            <Activity className="w-6 h-6" />
          </div>
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase flex items-center gap-2">
            <span className="text-pink-600">KAT</span> & <span className="text-emerald-600">JM</span>
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Daily Exercise & Photo Proof
          </p>
        </div>
      </div>

      {/* Navigation Tabs - Pink, Green, and White Palette */}
      <nav className="flex bg-slate-100/90 p-1.5 rounded-3xl w-full sm:w-auto justify-center border border-slate-200/60">
        {/* KAT - Pink Button */}
        <button
          onClick={() => onTabChange('KAT')}
          className={`flex-1 sm:flex-initial px-6 sm:px-8 py-2.5 sm:py-3 font-black rounded-2xl text-xs sm:text-sm uppercase tracking-wider transition-all ${activeTab === 'KAT'
            ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30 ring-2 ring-pink-500'
            : 'text-slate-600 hover:text-pink-700 hover:bg-white/60'
            }`}
        >
          KAT
        </button>

        {/* JM - Green Button */}
        <button
          onClick={() => onTabChange('JM')}
          className={`flex-1 sm:flex-initial px-6 sm:px-8 py-2.5 sm:py-3 font-black rounded-2xl text-xs sm:text-sm uppercase tracking-wider transition-all ${activeTab === 'JM'
            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-500'
            : 'text-slate-600 hover:text-emerald-700 hover:bg-white/60'
            }`}
        >
          JM
        </button>

        {/* BOTH - Dual White Button */}
        <button
          onClick={() => onTabChange('BOTH')}
          className={`flex-1 sm:flex-initial px-5 sm:px-6 py-2.5 sm:py-3 font-black rounded-2xl text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'BOTH'
            ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 ring-2 ring-slate-800'
            : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
        >
          <div className="flex items-center -space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <span className="hidden sm:inline">TOGETHER</span>
          <span className="sm:hidden">BOTH</span>
        </button>
      </nav>

      {/* Streak Badge & Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {syncStatus && (
          <div className="relative">
            <button
              onClick={() => setShowSyncTooltip(v => !v)}
              onMouseEnter={() => setShowSyncTooltip(true)}
              onMouseLeave={() => setShowSyncTooltip(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border shadow-2xs transition ${syncStatus.connected
                  ? 'bg-emerald-50/90 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-amber-50/90 border-amber-200 text-amber-700 hover:bg-amber-100'
                }`}
              title={syncStatus.connected ? 'Cloud sync enabled' : 'Not syncing to cloud'}
            >
              {syncStatus.connected ? (
                <Cloud className="w-4 h-4" />
              ) : (
                <CloudOff className="w-4 h-4" />
              )}
              <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">
                {syncStatus.connected ? 'Cloud Sync' : 'Device Only'}
              </span>
            </button>

            {showSyncTooltip && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 text-white text-xs font-medium rounded-2xl px-4 py-3 shadow-xl z-50">
                {syncStatus.connected ? (
                  <>
                    <p className="font-black uppercase tracking-wider text-emerald-400 mb-1">Cloud Sync Active</p>
                    <p className="text-slate-200">
                      Workout history is saved to Supabase and will appear on any device.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-black uppercase tracking-wider text-amber-400 mb-1">Device-Only Storage</p>
                    <p className="text-slate-200">
                      {syncStatus.error || 'History is saved only in this browser and will not appear on other devices.'}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 bg-pink-50/80 px-3.5 py-1.5 rounded-2xl border border-pink-200">
          <span className="text-xs font-black text-pink-700 uppercase tracking-widest hidden sm:inline">
            STREAK:
          </span>
          <span className="px-3 py-1 bg-white text-rose-600 rounded-full font-black text-sm sm:text-base flex items-center gap-1 shadow-2xs border border-pink-100">
            {currentActiveStreak} <Flame className="w-4 h-4 fill-rose-500 text-rose-500" />
          </span>
        </div>

        {onSaveProfile && (
          <>
            {/* KAT profile settings */}
            <button
              onClick={() => setProfileModalUser('KAT')}
              className="p-2 text-pink-400 hover:text-pink-700 bg-white hover:bg-pink-50 rounded-2xl border border-pink-200 shadow-2xs transition"
              title="Edit Kat's Profile & Goal"
            >
              <Settings2 className="w-4 h-4" />
            </button>

            {/* JM profile settings */}
            <button
              onClick={() => setProfileModalUser('JM')}
              className="p-2 text-emerald-400 hover:text-emerald-700 bg-white hover:bg-emerald-50 rounded-2xl border border-emerald-200 shadow-2xs transition"
              title="Edit Jm's Profile & Goal"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </>
        )}

        {onResetData && (
          <button
            onClick={() => {
              if (window.confirm('Delete ALL workout logs for Jm & Kat from the database?')) {
                onResetData();
              }
            }}
            className="p-2 text-rose-400 hover:text-rose-700 bg-white hover:bg-rose-50 rounded-2xl border border-rose-200 shadow-2xs transition"
            title="Delete All Workout Logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Profile edit modal */}
      {profileModalUser && onSaveProfile && (
        <UserProfileModal
          user={profileModalUser}
          profile={profiles[profileModalUser]}
          isOpen={true}
          onClose={() => setProfileModalUser(null)}
          onSave={async (user, profile) => {
            await onSaveProfile(user, profile);
            setProfileModalUser(null);
          }}
        />
      )}
    </header>
  );
};