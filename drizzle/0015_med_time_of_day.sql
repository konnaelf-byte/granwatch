-- Migration: 0015_med_time_of_day
-- Adds an optional time-of-day to care routines (tester request):
-- when frequency is "daily" the family can pin the routine to
-- morning / midday / evening. NULL = any time (existing rows unchanged).
ALTER TABLE `elderMedications` ADD COLUMN `timeOfDay` enum('am','midday','pm');
