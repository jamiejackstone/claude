import React from 'react';
import { useSchedule } from '../context/ScheduleContext';
import { useSessionPlans } from '../context/SessionPlanContext';
import { format, startOfWeek, addDays, isSameDay, isWithinInterval, parseISO } from 'date-fns';
import { cn } from '../lib/utils';
import { Calendar as CalendarIcon, Clock, MapPin, Users } from 'lucide-react';

export default function CalendarView({ 
  activeLocation, 
  activeAgeGroup 
}: { 
  activeLocation: string | null;
  activeAgeGroup: string;
}) {
  const { settings, getCurrentTermAndWeek } = useSchedule();
  const { sessionPlans } = useSessionPlans();
  
  // Generate a 4-week calendar starting from the current week
  const today = new Date();
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 0 }); // Sunday
  
  const weeks = Array.from({ length: 4 }).map((_, weekIndex) => {
    const weekStartDate = addDays(currentWeekStart, weekIndex * 7);
    const { term, week, isHolidayWeek, holidayName, bankHolidays } = getCurrentTermAndWeek(weekStartDate);
    
    // Find plan for this week
    const plan = sessionPlans.find(p => 
      p.term === term && 
      p.week === week && 
      p.ageGroup === activeAgeGroup &&
      (activeLocation === "ALL LOCATIONS" || p.locationId === activeLocation)
    ) || sessionPlans.find(p => 
      p.term === term && 
      p.week === week && 
      p.ageGroup === activeAgeGroup &&
      !p.locationId
    );

    return {
      startDate: weekStartDate,
      term,
      week,
      isHolidayWeek,
      holidayName,
      bankHolidays,
      plan
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-yellow/10 flex items-center justify-center text-brand-yellow">
          <CalendarIcon size={20} />
        </div>
        <div>
          <h2 className="font-display text-2xl tracking-wider text-white">Schedule Overview</h2>
          <p className="text-xs text-white/40 uppercase tracking-widest mt-1">4-Week Outlook</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {weeks.map((weekData, index) => (
          <div 
            key={index}
            className={cn(
              "glass-card p-6 border-l-4 transition-all",
              weekData.isHolidayWeek ? "border-l-brand-yellow/50 bg-brand-yellow/5" :
              index === 0 ? "border-l-brand-yellow" : "border-l-white/10"
            )}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex flex-col items-center justify-center border border-white/10">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{format(weekData.startDate, 'MMM')}</span>
                  <span className="font-display text-xl text-brand-yellow">{format(weekData.startDate, 'dd')}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-yellow px-2 py-0.5 rounded-md bg-brand-yellow/10">
                      {weekData.term} Term
                    </span>
                    {!weekData.isHolidayWeek && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
                        Week {weekData.week}
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-lg tracking-wide text-white">
                    {weekData.isHolidayWeek ? `Holiday: ${weekData.holidayName}` : `Week of ${format(weekData.startDate, 'MMMM do')}`}
                  </h3>
                  {weekData.bankHolidays.length > 0 && (
                    <p className="text-xs text-blue-400 mt-1">
                      Bank Holiday: {weekData.bankHolidays.map(h => h.name).join(', ')}
                    </p>
                  )}
                </div>
              </div>

              {!weekData.isHolidayWeek && (
                <div className="flex-1 max-w-md">
                  {weekData.plan ? (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Users size={14} className="text-brand-yellow" />
                          <span className="text-xs font-bold text-white">{weekData.plan.ageGroup}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-white/40" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{weekData.plan.length}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {weekData.plan.activities.slice(0, 2).map((activity, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-yellow mt-1.5 flex-shrink-0" />
                            <p className="text-xs text-white/80 line-clamp-1">{activity.drill?.name || activity.name}</p>
                          </div>
                        ))}
                        {weekData.plan.activities.length > 2 && (
                          <p className="text-[10px] font-bold text-white/40 italic pl-3.5">
                            + {weekData.plan.activities.length - 2} more activities
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center p-4 border border-dashed border-white/10 rounded-xl bg-white/5">
                      <p className="text-xs text-white/40 italic text-center">No session plan generated</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
