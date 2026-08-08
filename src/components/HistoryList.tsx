import React from 'react';
import { UserProfile, UserType, WorkoutLog } from '../types';
import { ImageIcon } from 'lucide-react';
import { WorkoutLogCard } from './WorkoutLogCard';

interface HistoryListProps {
  user?: UserType;
  profiles: Record<UserType, UserProfile>;
  logs: WorkoutLog[];
  onDeleteLog: (id: string) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  user,
  profiles,
  logs,
  onDeleteLog
}) => {
  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-[32px] p-8 text-center border-2 border-indigo-50 shadow-sm flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-3">
          <ImageIcon className="w-8 h-8" />
        </div>
        <h4 className="text-lg font-black text-slate-800">No Workout Logs Yet</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          {user ? `${profiles[user]?.name} hasn't logged any workouts.` : 'No exercise records recorded yet.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
          {user ? `${profiles[user]?.name}'s History` : 'Recent History'}
        </h3>
        <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider">
          {logs.length} Logged
        </span>
      </div>

      <div className="space-y-3">
        {logs.map((log) => (
          <WorkoutLogCard
            key={log.id}
            log={log}
            profiles={profiles}
            onDeleteLog={onDeleteLog}
          />
        ))}
      </div>
    </div>
  );
};
