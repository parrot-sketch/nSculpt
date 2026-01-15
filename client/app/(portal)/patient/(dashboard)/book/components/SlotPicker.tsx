'use client';

import { useState } from 'react';
import { format, addDays, startOfDay, isPast, isToday } from 'date-fns';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import type { AvailableSlotsResponse } from '@/services/appointment.service';

interface SlotPickerProps {
  doctorId: string | null;
  doctorName: string | null;
  availability: AvailableSlotsResponse | undefined;
  isLoading: boolean;
  selectedDate: string | null; // YYYY-MM-DD
  selectedSlot: { start: string; end: string } | null;
  onDateSelect: (date: string) => void;
  onSlotSelect: (slot: { start: string; end: string }) => void;
}

/**
 * Step 2: Date and Time Slot Selection Component
 * 
 * Allows patient to select a date and available time slot
 */
export default function SlotPicker({
  doctorId,
  doctorName,
  availability,
  isLoading,
  selectedDate,
  selectedSlot,
  onDateSelect,
  onSlotSelect,
}: SlotPickerProps) {
  const [selectedDateState, setSelectedDateState] = useState<string | null>(selectedDate);

  // Generate next 14 days for date selection
  const availableDates = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(new Date(), i);
    return format(date, 'yyyy-MM-dd');
  });

  const handleDateChange = (date: string) => {
    setSelectedDateState(date);
    onDateSelect(date);
  };

  // Format time slot for display
  const formatTimeSlot = (start: string) => {
    return format(new Date(start), 'h:mm a');
  };

  // Check if slot is in the past
  const isSlotPast = (start: string) => {
    return isPast(new Date(start));
  };

  if (!doctorId) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-600 font-medium mb-2">Please select a doctor first</p>
        <p className="text-slate-500 text-sm">Go back to step 1 to choose a clinician</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-900 mb-2">Select Date & Time</h2>
      {doctorName && (
        <p className="text-slate-600 mb-6">
          Available slots for <span className="font-medium">Dr. {doctorName}</span>
        </p>
      )}

      {/* Date Selection */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-slate-700 mb-3">
          <Calendar className="h-4 w-4 inline mr-2" />
          Select Date
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {availableDates.map((date) => {
            const dateObj = new Date(date);
            const isSelected = selectedDateState === date;
            const isPastDate = isPast(startOfDay(dateObj)) && !isToday(dateObj);

            return (
              <button
                key={date}
                onClick={() => !isPastDate && handleDateChange(date)}
                disabled={isPastDate}
                className={`p-3 rounded-lg border-2 transition-all text-center ${isSelected
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold'
                    : isPastDate
                      ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700'
                  }`}
              >
                <div className="text-xs font-medium">
                  {format(dateObj, 'EEE')}
                </div>
                <div className="text-sm font-semibold mt-1">
                  {format(dateObj, 'd')}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {format(dateObj, 'MMM')}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Slot Selection */}
      {selectedDateState && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            <Clock className="h-4 w-4 inline mr-2" />
            Select Time
          </label>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4" />
              <p className="text-slate-500 text-sm">Checking availability...</p>
            </div>
          ) : availability && availability.availableSlots.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {availability.availableSlots.map((slot, index) => {
                const isSelected =
                  selectedSlot?.start === slot.start && selectedSlot?.end === slot.end;
                const isPastSlot = isSlotPast(slot.start);

                return (
                  <button
                    key={index}
                    onClick={() => !isPastSlot && onSlotSelect(slot)}
                    disabled={isPastSlot}
                    className={`p-3 rounded-lg border-2 transition-all text-center ${isSelected
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold'
                        : isPastSlot
                          ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
                          : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700'
                      }`}
                  >
                    <Clock className="h-4 w-4 mx-auto mb-1" />
                    <div className="text-sm font-medium">{formatTimeSlot(slot.start)}</div>
                    {isPastSlot && (
                      <div className="text-xs text-slate-400 mt-1">Past</div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
              <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-medium mb-2">No available slots</p>
              <p className="text-slate-500 text-sm">
                No time slots are available for this date. Please select another date.
              </p>
            </div>
          )}
        </div>
      )}

      {!selectedDateState && (
        <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
          <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 font-medium mb-2">Select a date</p>
          <p className="text-slate-500 text-sm">
            Choose a date above to see available time slots
          </p>
        </div>
      )}
    </div>
  );
}
