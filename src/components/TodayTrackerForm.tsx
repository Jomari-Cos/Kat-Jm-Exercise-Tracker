import React, { useState } from 'react';
import { UserProfile, UserStats, UserType, ExerciseCategory, WorkoutLog } from '../types';
import { Camera, Clock, Sparkles, Check, Plus, MapPin, Smile, Image as ImageIcon } from 'lucide-react';
import { getTodayDateStr } from '../utils/storage';
import { CameraCaptureModal } from './CameraCaptureModal';

interface TodayTrackerFormProps {
  user: UserType;
  profile: UserProfile;
  stats: UserStats;
  onLogSubmit: (log: Omit<WorkoutLog, 'id' | 'timestamp'>) => Promise<void>;
}

const CATEGORIES: { id: ExerciseCategory; label: string; icon: string }[] = [
  { id: 'Strength', label: 'Strength', icon: '🏋️' },
  { id: 'Running', label: 'Running', icon: '🏃' },
  { id: 'Walking', label: 'Walking', icon: '🚶' },
  { id: 'Pilates', label: 'Pilates', icon: '🧘‍♀️' },
  { id: 'Yoga', label: 'Yoga', icon: '🧘' },
  { id: 'HIIT', label: 'HIIT', icon: '⚡' },
  { id: 'Cycling', label: 'Cycling', icon: '🚴' },
  { id: 'Gym Workout', label: 'Gym', icon: '💪' },
  { id: 'Sports', label: 'Sports', icon: '⚽' },
  { id: 'Other', label: 'Other', icon: '✨' },
];

const PRESET_MINUTES = [15, 30, 45, 60, 90];
const MOOD_OPTIONS = ['🔥 On Fire', '💪 Strong', '💦 Sweaty', '🧘 Calm', '🌿 Fresh', '⚡ Fast'];

export const TodayTrackerForm: React.FC<TodayTrackerFormProps> = ({
  user,
  profile,
  stats,
  onLogSubmit
}) => {
  const isJm = user === 'JM';
  const todayStr = getTodayDateStr();

  // Formatting date header
  const d = new Date();
  const dayName = d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const fullDate = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Theme palettes (Pink for KAT, Green for JM, White background canvas)
  const primaryBg = isJm
    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
    : 'bg-pink-600 hover:bg-pink-700 shadow-pink-200';
  const primaryText = isJm ? 'text-emerald-600' : 'text-pink-600';
  const lightBg = isJm ? 'bg-emerald-50 border-emerald-200' : 'bg-pink-50 border-pink-200';
  const cardBorder = isJm ? 'border-emerald-100' : 'border-pink-100';

  // State
  const [durationMins, setDurationMins] = useState<number>(45);
  const [customName, setCustomName] = useState<string>('');
  const [category, setCategory] = useState<ExerciseCategory>(profile.favExercise || 'Strength');
  const [notes, setNotes] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [mood, setMood] = useState<string>('💪 Strong');
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);

  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showAddAnother, setShowAddAnother] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (durationMins <= 0) return;

    setIsSubmitting(true);

    let feedback = '';
    try {
      const resp = await fetch('/api/ai-motivation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: profile.name,
          exerciseType: category,
          durationMins,
          notes,
          imageBase64: proofPhoto
        })
      });
      const data = await resp.json();
      if (data.feedback) {
        feedback = data.feedback;
      }
    } catch (err) {
      console.error('AI motivation error:', err);
    }

    const logData: Omit<WorkoutLog, 'id' | 'timestamp'> = {
      user,
      date: todayStr,
      exerciseType: category,
      customName: customName.trim() || `${category} Workout`,
      durationMins,
      notes: notes.trim(),
      location: location.trim(),
      mood,
      proofPhotoUrl: proofPhoto || undefined,
      aiFeedback: feedback || undefined
    };

    await onLogSubmit(logData);
    setIsSubmitting(false);
    setShowAddAnother(false);
    setProofPhoto(null);
    setNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Date Header */}
      <div className="flex justify-between items-end pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-none uppercase tracking-tight">
            {dayName}
          </h2>
          <p className="text-sm sm:text-base text-slate-500 font-bold mt-1">
            {fullDate}
          </p>
        </div>
        <div className="text-right">
          <span className={`text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${
            isJm ? 'bg-emerald-100 text-emerald-800' : 'bg-pink-100 text-pink-800'
          }`}>
            {profile.name}'s Log
          </span>
        </div>
      </div>

      {/* Main Container Card */}
      {stats.loggedToday && stats.todayLog && !showAddAnother ? (
        <div className={`bg-white rounded-[32px] p-6 sm:p-8 border-2 ${cardBorder} shadow-xl shadow-slate-200/50 space-y-6`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <span className={`w-9 h-9 rounded-full ${isJm ? 'bg-emerald-500' : 'bg-pink-500'} text-white font-black flex items-center justify-center shadow-md`}>
                <Check className="w-5 h-5 stroke-[3]" />
              </span>
              <div>
                <span className={`text-xs font-black uppercase tracking-wider block ${primaryText}`}>
                  Logged Today
                </span>
                <h3 className="text-xl font-black text-slate-900">
                  {stats.todayLog.customName || stats.todayLog.exerciseType}
                </h3>
              </div>
            </div>

            <button
              onClick={() => setShowAddAnother(true)}
              className={`px-5 py-2.5 rounded-2xl text-xs font-black text-white ${primaryBg} transition flex items-center gap-1.5 shadow-md`}
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Log Extra Session</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stats.todayLog.proofPhotoUrl ? (
              <div className="relative rounded-3xl overflow-hidden border-2 border-slate-200 bg-slate-900 h-56 group shadow-md">
                <img
                  src={stats.todayLog.proofPhotoUrl}
                  alt="Proof photo"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent p-4 text-white text-xs flex justify-between items-center">
                  <span className="font-bold flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-400" /> Photo Proof Verified
                  </span>
                  <span className={`font-black ${isJm ? 'bg-emerald-500 text-slate-950' : 'bg-pink-500 text-white'} text-[10px] px-2.5 py-0.5 rounded-full`}>
                    {stats.todayLog.durationMins} MINS
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 flex flex-col items-center justify-center text-center text-slate-400 h-56">
                <ImageIcon className="w-10 h-10 mb-2 stroke-1 text-slate-300" />
                <p className="text-xs font-bold text-slate-500">No Photo Proof Attached Today</p>
              </div>
            )}

            <div className="flex flex-col justify-between space-y-4">
              <div className={`p-5 rounded-3xl border ${lightBg}`}>
                <p className="text-xs font-black uppercase tracking-widest mb-1 text-slate-500">
                  Duration & Mood
                </p>
                <p className="text-3xl font-black text-slate-900">
                  {stats.todayLog.durationMins} <span className="text-lg font-bold text-slate-400">MINS</span>
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-bold text-slate-800 bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-2xs">
                    {stats.todayLog.exerciseType}
                  </span>
                  {stats.todayLog.mood && (
                    <span className="text-xs font-bold text-slate-800 bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-2xs">
                      {stats.todayLog.mood}
                    </span>
                  )}
                </div>
              </div>

              {stats.todayLog.aiFeedback && (
                <div className={`p-4 rounded-3xl border ${lightBg} text-xs font-medium text-slate-800 leading-relaxed`}>
                  <span className={`font-black block mb-1 uppercase tracking-wider flex items-center gap-1 ${primaryText}`}>
                    <Sparkles className="w-3.5 h-3.5" /> AI Coach Feedback:
                  </span>
                  "{stats.todayLog.aiFeedback}"
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={`bg-white rounded-[32px] p-6 sm:p-8 border-2 ${cardBorder} shadow-xl shadow-slate-200/50 space-y-8`}>
          {/* Minutes Input Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className={`block text-xs sm:text-sm font-black uppercase tracking-widest ${primaryText}`}>
                How many minutes today?
              </label>
              {showAddAnother && (
                <button
                  type="button"
                  onClick={() => setShowAddAnother(false)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 underline"
                >
                  Cancel Extra Log
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type="number"
                min={1}
                max={300}
                value={durationMins || ''}
                onChange={(e) => setDurationMins(parseInt(e.target.value) || 0)}
                placeholder="45"
                className={`w-full text-5xl sm:text-7xl font-black bg-slate-50 rounded-3xl p-5 sm:p-6 focus:outline-none border-4 border-slate-100 transition-all placeholder:text-slate-200 ${primaryText}`}
              />
              <span className="absolute right-6 bottom-6 sm:bottom-8 text-xl sm:text-2xl font-black text-slate-400 pointer-events-none">
                MINS
              </span>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2 mt-3">
              {PRESET_MINUTES.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMins(mins)}
                  className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-black transition ${
                    durationMins === mins
                      ? `${primaryBg} text-white shadow-sm`
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {mins} MINS
                </button>
              ))}
            </div>
          </div>

          {/* Exercise Type */}
          <div>
            <label className={`block text-xs sm:text-sm font-black uppercase tracking-widest mb-3 ${primaryText}`}>
              Exercise Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`p-3 rounded-2xl font-bold text-xs transition border flex items-center gap-2 ${
                    category === cat.id
                      ? `${isJm ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-black ring-2 ring-emerald-300' : 'bg-pink-50 border-pink-400 text-pink-950 font-black ring-2 ring-pink-300'}`
                      : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-base">{cat.icon}</span>
                  <span className="truncate">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Photo Proof Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className={`block text-xs sm:text-sm font-black uppercase tracking-widest ${primaryText}`}>
                Proof of Exercise
              </label>
              {proofPhoto && (
                <button
                  type="button"
                  onClick={() => setProofPhoto(null)}
                  className="text-xs font-bold text-rose-500 hover:underline"
                >
                  Remove Photo
                </button>
              )}
            </div>

            {proofPhoto ? (
              <div className="relative h-48 w-full rounded-3xl overflow-hidden border-4 border-slate-200 bg-slate-900 group shadow-md">
                <img
                  src={proofPhoto}
                  alt="Proof preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className="px-4 py-2 bg-white text-slate-900 rounded-2xl font-black text-xs shadow-lg"
                  >
                    Retake Photo 📸
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setIsCameraOpen(true)}
                className={`h-44 w-full border-4 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center bg-slate-50 hover:bg-white transition-all cursor-pointer group p-4 border-slate-200 hover:${cardBorder}`}
              >
                <div className={`w-14 h-14 ${isJm ? 'bg-emerald-100 text-emerald-600' : 'bg-pink-100 text-pink-600'} rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform mb-3`}>
                  <Camera className="h-7 w-7" />
                </div>
                <p className="text-slate-800 font-black text-sm">Take Photo / Upload Proof</p>
                <p className="text-xs font-medium text-slate-400 mt-0.5">
                  Smart watch, gym selfie, or shoes
                </p>
              </div>
            )}
          </div>

          {/* Additional details */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
              Extra Details (Optional)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Title (e.g. Leg Day, Morning Run)"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-400"
              />
              <input
                type="text"
                placeholder="Location (e.g. Gym, Home, Park)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-400"
              />
            </div>

            {/* Mood options */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {MOOD_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(m)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    mood === m
                      ? `${primaryBg} text-white`
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              placeholder="Notes or accomplishments..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-400 resize-none"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting || durationMins <= 0}
            className={`w-full ${primaryBg} text-white text-lg sm:text-xl font-black py-5 rounded-3xl shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2`}
          >
            {isSubmitting ? (
              <span>LOGGING WORKOUT...</span>
            ) : (
              <span>LOG SESSION ({durationMins} MINS)</span>
            )}
          </button>
        </form>
      )}

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(photo) => setProofPhoto(photo)}
      />
    </div>
  );
};
