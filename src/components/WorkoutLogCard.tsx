import React, { useState } from 'react';
import { UserProfile, WorkoutLog } from '../types';
import { formatDatePretty } from '../utils/storage';
import { formatDistance, formatClockTime } from '../lib/trackerUtils';
import { Camera, Trash2, Sparkles, CheckCircle2, MapPin, Eye, Footprints, Route, Timer } from 'lucide-react';

interface WorkoutLogCardProps {
  log: WorkoutLog;
  profiles: Record<string, UserProfile>;
  onDeleteLog: (id: string) => void;
}

/**
 * Reusable card that renders every field of a single workout log.
 * Used both by HistoryList (flat list) and HistoryCalendar (day detail view).
 */
export const WorkoutLogCard: React.FC<WorkoutLogCardProps> = ({ log, profiles, onDeleteLog }) => {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const logUser = profiles[log.user];
  const isJm = log.user === 'JM';


  return (
    <>
      <div className="bg-white p-5 rounded-3xl border-2 border-indigo-50/80 hover:border-indigo-100 shadow-xs hover:shadow-md transition-all group">
        <div className="flex items-start gap-4">
          {/* Proof Photo Thumbnail */}
          <div
            onClick={() => log.proofPhotoUrl && setSelectedPhoto(log.proofPhotoUrl)}
            className={`w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 relative border ${
              log.proofPhotoUrl ? 'cursor-pointer hover:opacity-90' : 'bg-slate-100'
            }`}
          >
            {log.proofPhotoUrl ? (
              <>
                <img src={log.proofPhotoUrl} alt="Proof" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                  <Eye className="w-5 h-5" />
                </div>
              </>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex flex-col items-center justify-center text-indigo-400 p-1">
                <Camera className="w-6 h-6 stroke-1.5" />
                <span className="text-[9px] font-bold mt-0.5">No Proof</span>
              </div>
            )}
          </div>


          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isJm ? 'bg-emerald-100 text-emerald-800' : 'bg-pink-100 text-pink-800'
                  }`}
                >
                  {logUser.name}
                </span>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider truncate">
                  {formatDatePretty(log.date)}
                </p>
              </div>

              <div className="flex items-center gap-1">
                {log.proofPhotoUrl && (
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-black text-[10px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    VERIFIED
                  </span>
                )}

                <button
                  onClick={() => {
                    if (window.confirm('Delete this workout log?')) {
                      onDeleteLog(log.id);
                    }
                  }}
                  className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition"
                  title="Delete log"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h4 className="text-lg font-black text-indigo-950 mt-1 truncate">
              {log.durationMins} Minutes{' '}
              <span className="text-sm font-semibold text-slate-500 font-sans">
                • {log.exerciseType}
              </span>
            </h4>

            {log.customName && log.customName !== `${log.exerciseType} Workout` && (
              <p className="text-xs font-semibold text-slate-700 truncate mt-0.5">
                "{log.customName}"
              </p>
            )}

            {/* Mood & Location Tags */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {log.mood && (
                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                  {log.mood}
                </span>
              )}
              {log.location && (
                <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-indigo-400" />
                  {log.location}
                </span>
              )}
            </div>

            {/* Auto-tracked metrics (steps / distance / start-end time) */}
            {(log.steps !== undefined || log.distanceMeters !== undefined || (log.startTime && log.endTime)) && (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {log.steps !== undefined && log.steps > 0 && (
                  <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                    <Footprints className="w-3 h-3 text-teal-600" /> {log.steps.toLocaleString()} steps
                  </span>
                )}
                {log.distanceMeters !== undefined && log.distanceMeters > 0 && (
                  <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                    <Route className="w-3 h-3 text-indigo-400" /> {formatDistance(log.distanceMeters)}
                  </span>
                )}
                {log.startTime && log.endTime && (
                  <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                    <Timer className="w-3 h-3 text-amber-500" /> {formatClockTime(log.startTime)} → {formatClockTime(log.endTime)}
                  </span>
                )}
              </div>
            )}

            {/* AI Feedback */}
            {log.aiFeedback && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-[11px] text-slate-700 leading-snug">
                <span className="font-bold text-indigo-900 flex items-center gap-1 mb-0.5">
                  <Sparkles className="w-3 h-3 text-indigo-600" /> AI Coach Cheer:
                </span>
                "{log.aiFeedback}"
              </div>
            )}

            {/* Notes */}
            {log.notes && (
              <p className="mt-1.5 text-xs text-slate-600 italic">
                "{log.notes}"
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="relative max-w-2xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl p-2 border border-slate-800">
            <img
              src={selectedPhoto}
              alt="Proof photo full view"
              className="w-full h-auto max-h-[80vh] object-contain rounded-2xl"
            />
            <div className="p-3 text-center text-xs font-bold text-slate-400">
              Click anywhere to close
            </div>
          </div>
        </div>
      )}
    </>
  );
};
