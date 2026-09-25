import React from 'react';
import type { ClassSession } from '../types';

interface ClassSessionListProps {
  sessions: ClassSession[];
  compact?: boolean;
}

// Renders each class from location data. A comingSoon class shows its label
// only: no clock time and no booking or trial link.
export const ClassSessionList: React.FC<ClassSessionListProps> = ({ sessions, compact }) => (
  <ul className={compact ? 'space-y-2' : 'mt-6 grid gap-3'} aria-label="Class times">
    {sessions.map((session) => (
      <li
        key={session.id}
        className={
          compact
            ? 'flex items-center justify-between gap-3'
            : 'flex items-center justify-between gap-4 bg-white border-2 border-brand-dark rounded-2xl px-4 py-3'
        }
      >
        <span
          className={
            compact
              ? 'font-black uppercase tracking-wide text-brand-dark text-xs'
              : 'font-display uppercase text-lg leading-none text-brand-dark'
          }
        >
          {session.ageGroup}
        </span>
        {session.comingSoon ? (
          <span className="shrink-0 inline-block px-3 py-1 rounded-lg bg-blue-600 border-2 border-brand-dark text-white text-[10px] font-black tracking-wide text-center">
            {session.comingSoonLabel || 'Coming soon'}
          </span>
        ) : (
          <span
            className={
              compact
                ? 'font-black text-xs text-brand-dark whitespace-nowrap'
                : 'font-black text-sm text-brand-dark whitespace-nowrap'
            }
          >
            {session.day} {session.time}
          </span>
        )}
      </li>
    ))}
  </ul>
);
