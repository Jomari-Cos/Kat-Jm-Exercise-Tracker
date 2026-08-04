import React, { useState } from 'react';
import { UserProfile, UserType, ExerciseCategory } from '../types';
import { X, Check, User, Target, Award } from 'lucide-react';

interface UserProfileModalProps {
  user: UserType;
  profile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: UserType, profile: UserProfile) => Promise<void> | void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  profile,
  isOpen,
  onClose,
  onSave
}) => {
  const [weeklyGoalMins, setWeeklyGoalMins] = useState<number>(profile.weeklyGoalMins);
  const [bio, setBio] = useState<string>(profile.bio);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(user, {
        ...profile,
        weeklyGoalMins: Number(weeklyGoalMins) || 150,
        bio: bio.trim()
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-600" />
            Edit {profile.name}'s Profile & Weekly Goal
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <img
              src={profile.avatar}
              alt={profile.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-slate-300"
            />
            <div>
              <p className="font-bold text-slate-900 text-sm">{profile.name}</p>
              <p className="text-xs text-slate-500">Favorite: {profile.favExercise}</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
              Weekly Target Minutes
            </label>
            <input
              type="number"
              min={30}
              max={1000}
              step={15}
              value={weeklyGoalMins}
              onChange={(e) => setWeeklyGoalMins(Number(e.target.value))}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Standard recommended activity target is 150 minutes / week.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
              Motivation Motto / Bio
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
