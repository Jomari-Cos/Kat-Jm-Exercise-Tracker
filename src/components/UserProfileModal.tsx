import React, { useState, useRef } from 'react';
import { UserProfile, UserType, ExerciseCategory } from '../types';
import { X, Check, User, Target, Award, Upload, Trash2 } from 'lucide-react';
import { DEFAULT_AVATARS } from '../utils/storage';

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
  const [bio, setBio] = useState<string>(profile.bio ?? '');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Avatar editor state
  const [avatarValue, setAvatarValue] = useState<string>(profile.avatar);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isDefaultAvatar = avatarValue === DEFAULT_AVATARS[user];
  const isCustomAvatar = !isDefaultAvatar && avatarValue !== profile.avatar;

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select an image file (PNG, JPEG, GIF, etc.).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('That photo is too large. Please choose one smaller than 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Downscale to keep the persisted base64 avatar small (max 512px).
      const img = new Image();
      img.onload = () => {
        const maxDim = 512;
        let width = img.width;
        let height = img.height;
        const ratio = Math.min(1, maxDim / Math.max(width, height));
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setAvatarValue(canvas.toDataURL('image/png'));
        } else {
          setAvatarValue(dataUrl);
        }
      };
      img.onerror = () => setAvatarValue(dataUrl);
      img.src = dataUrl;
    };
    reader.onerror = () => setAvatarError('Could not read the selected image.');
    reader.readAsDataURL(file);

    // Reset the input so the same file can be selected again if desired.
    e.target.value = '';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(user, {
        ...profile,
        avatar: avatarValue,
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

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Avatar editor */}
          <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="relative">
              <img
                src={avatarValue}
                alt={profile.name}
                className="w-20 h-20 rounded-full object-cover border-2 border-slate-300"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 text-sm">{profile.name}</p>
              <p className="text-xs text-slate-500">Favorite: {profile.favExercise}</p>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  {isDefaultAvatar ? 'Upload Photo' : 'Change Photo'}
                </button>
                {!isDefaultAvatar && (
                  <button
                    type="button"
                    onClick={() => setAvatarValue(DEFAULT_AVATARS[user])}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    Reset to Default
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />

              {avatarError && (
                <p className="mt-2 text-xs text-red-600">{avatarError}</p>
              )}
              {!avatarError && isCustomAvatar && (
                <p className="mt-1 text-[10px] text-slate-400">
                  Custom photo will be saved to this profile.
                </p>
              )}
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