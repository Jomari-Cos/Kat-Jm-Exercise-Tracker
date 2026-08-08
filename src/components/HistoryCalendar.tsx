import React, { useMemo, useState } from 'react';
import { UserProfile, UserType, WorkoutLog } from '../types';
import { getTodayDateStr } from '../utils/storage';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  ImageIcon,
  Activity
} from 'lucide-react';
import { WorkoutLogCard } from './WorkoutLogCard';

interface HistoryCalendarProps {
  user?: UserType;
  profiles: Record<UserType, UserProfile>;
  logs: WorkoutLog[];
  onDeleteLog: (id: string) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Format a Date as YYYY-MM-DD using local time. */
function toDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Pretty long label for the day-detail header, e.g. "Wednesday, August 5". */
function formatLongDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

export const HistoryCalendar: React.FC<HistoryCalendarProps> = ({
  user,
  profiles,
  logs,
  onDeleteLog
}) => {
  const todayStr = getTodayDateStr();
  const [visible, setVisible] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Map date -> logs for this calendar. When no `user` is given, show everyone.
  const logsByDate = useMemo(() => {
    const map: Record<string, WorkoutLog[]> = {};
    for (const log of logs) {
      if (user && log.user !== user) continue;
      (map[log.date] ||= []).push(log);
    }
    return map;
  }, [logs, user]);

  // Dates that have at least one log, sorted ascending (for day nav).
  const activeDates = useMemo(
    () => Object.keys(logsByDate).sort((a, b) => (a < b ? -1 : 1)),
    [logsByDate]
  );

  // Build the visible month's grid cells (leading blanks first, then day numbers).
  const cells = useMemo(() => {
    const firstOfMonth = new Date(visible.year, visible.month, 1);
    const daysInMonth = new Date(visible.year, visible.month + 1, 0).getDate();
    const leadingBlanks = firstOfMonth.getDay();
    const list: (number | null)[] = [];
    for (let i = 0; i < leadingBlanks; i++) list.push(null);
    for (let day = 1; day <= daysInMonth; day++) list.push(day);
    // Pad trailing blanks so each row stays full.
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [visible]);

  const isJm = user === 'JM';
  const accent = isJm ? 'emerald' : 'pink';
  const accentBg = isJm ? 'bg-emerald-500' : 'bg-pink-500';
  const accentLight = isJm ? 'bg-emerald-100 text-emerald-700' : 'bg-pink-100 text-pink-700';

  const monthLabel = new Date(visible.year, visible.month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  const changeMonth = (delta: number) => {
    setVisible((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const goToToday = () => {
    const d = new Date();
    setVisible({ year: d.getFullYear(), month: d.getMonth() });
  };

  const sortedForSelected = useMemo(
    () => (selectedDate ? [...(logsByDate[selectedDate] || [])] : []),
    [selectedDate, logsByDate]
  );

  const selectedIndex = selectedDate ? activeDates.indexOf(selectedDate) : -1;
  const navTo = (index: number) => {
    const next = activeDates[index];
    if (!next) return;
    const [y, m] = next.split('-').map(Number);
    setVisible({ year: y, month: m - 1 });
    setSelectedDate(next);
  };

  // ================================================================
  // Render
  // ================================================================
  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between px-1">
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
            {user ? `${profiles[user]?.name}'s History` : 'History'}
          </h3>
          <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {Object.keys(logsByDate).length} Active Days
          </span>
        </div>

        {/* Month navigation */}
        <div className="bg-white rounded-3xl border-2 border-indigo-50/80 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
              title="Previous month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center">
              <span className="text-lg font-black text-slate-900 uppercase tracking-tight">
                {monthLabel}
              </span>
              <button
                onClick={goToToday}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider mt-0.5"
              >
                Today
              </button>
            </div>

            <button
              onClick={() => changeMonth(1)}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
              title="Next month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="text-center text-[10px] font-black text-slate-400 uppercase tracking-wider py-1"
              >
                {w}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) {
                return <div key={`blank-${i}`} className="aspect-square" />;
              }
              const dateStr = `${visible.year}-${String(visible.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayLogs = logsByDate[dateStr] || [];
              const totalMins = dayLogs.reduce((sum, l) => sum + l.durationMins, 0);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const hasLogs = dayLogs.length > 0;
              const cellPhoto = dayLogs.find((l) => l.proofPhotoUrl)?.proofPhotoUrl;
              const usePhotoBg = hasLogs && !!cellPhoto && !isSelected;
              const dayColor = isSelected || usePhotoBg ? 'text-white' : isToday ? 'text-indigo-600' : '';
              const badgeColor = isSelected || usePhotoBg ? 'text-white/90' : accentLight;

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`relative aspect-square rounded-xl overflow-hidden flex flex-col items-center justify-center gap-0.5 transition
                    ${isSelected
                      ? `${accentBg} text-white shadow-md`
                      : usePhotoBg
                        ? 'text-white'
                        : hasLogs
                          ? isJm
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-slate-800'
                            : 'bg-pink-50 hover:bg-pink-100 text-slate-800'
                          : 'text-slate-400 hover:bg-slate-100'
                    }
                    ${isToday && !isSelected ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}
                    ${usePhotoBg ? 'group' : ''}
                  `}
                  title={hasLogs ? `${dayLogs.length} workout(s), ${totalMins} min` : dateStr}
                >
                  {usePhotoBg && (
                    <>
                      <img
                        src={cellPhoto}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                    </>
                  )}
                  <span className={`relative z-10 text-sm font-black leading-none ${dayColor}`}>
                    {day}
                  </span>
                  {hasLogs && (
                    <span className={`relative z-10 text-[8px] font-black leading-none ${badgeColor}`}>
                      {totalMins}m
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-1 text-[11px] font-bold text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-md ${accentBg}`} /> Workout logged
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md ring-2 ring-indigo-400" /> Today
          </span>
        </div>
      </div>
      {/* Day Detail Modal */}
      {selectedDate && (
        <div
          onClick={() => setSelectedDate(null)}
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl max-h-[88vh] bg-slate-50 rounded-[32px] shadow-2xl border-2 border-indigo-100 overflow-hidden flex flex-col"
          >
            {/* Modal header */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b-2 border-indigo-50 bg-white">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {user ? `${profiles[user]?.name}'s Workouts` : 'Workouts'}
                </p>
                <h4 className="text-lg font-black text-slate-900 leading-tight">
                  {formatLongDate(selectedDate)}
                </h4>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Day summary */}
            <div className="flex items-center gap-4 px-6 py-3 bg-indigo-50/60 border-b border-indigo-50">
              <span className="text-xs font-black text-indigo-700 bg-white px-3 py-1 rounded-full ring-1 ring-indigo-100">
                {sortedForSelected.length} workout{sortedForSelected.length === 1 ? '' : 's'}
              </span>
              <span className="text-xs font-black text-indigo-700 bg-white px-3 py-1 rounded-full ring-1 ring-indigo-100">
                {sortedForSelected.reduce((sum, l) => sum + l.durationMins, 0)} min total
              </span>
              <span className="hidden sm:block text-[11px] font-bold text-slate-500 ml-auto">
                {activeDates.length > 0
                  ? `${selectedIndex + 1} of ${activeDates.length} active days`
                  : ''}
              </span>
            </div>

            {/* Day logs */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {sortedForSelected.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center border-2 border-indigo-50 shadow-sm flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-400 flex items-center justify-center mb-3">
                    <ImageIcon className="w-7 h-7" />
                  </div>
                  <h5 className="font-black text-slate-800">No Workouts This Day</h5>
                  <p className="text-xs text-slate-500 mt-1">
                    {user ? `${profiles[user]?.name} didn't log any workouts on this date.` : 'Nothing was logged on this date.'}
                  </p>
                </div>
              ) : (
                sortedForSelected.map((log) => (
                  <WorkoutLogCard
                    key={log.id}
                    log={log}
                    profiles={profiles}
                    onDeleteLog={onDeleteLog}
                  />
                ))
              )}
            </div>

            {/* Prev / next day with logs */}
            <div className="flex items-center justify-between px-6 py-3 border-t-2 border-indigo-50 bg-white">
              <button
                onClick={() => navTo(selectedIndex - 1)}
                disabled={selectedIndex <= 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                <Activity className="w-3.5 h-3.5 text-indigo-500" />
                {user ? `${profiles[user]?.name}'s` : ''} Calendar History
              </div>
              <button
                onClick={() => navTo(selectedIndex + 1)}
                disabled={selectedIndex < 0 || selectedIndex >= activeDates.length - 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};