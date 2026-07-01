-- Drop legacy tables replaced by the new HRIS absence + time-tracking systems.
-- timesheets      → replaced by time_entries (timestamptz, entry_type, duration)
-- time_off_requests → replaced by absence_requests (types, periods, approvals)
--
-- Run AFTER all application code has been updated to stop querying these tables.

drop table if exists time_off_requests cascade;
drop table if exists timesheets cascade;
