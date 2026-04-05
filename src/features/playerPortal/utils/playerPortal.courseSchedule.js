const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const DAY_NAME_TO_WEEKDAY = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

const cleanString = (value) => {
  if (value == null) return '';
  return String(value).trim();
};

export const isISODate = (value) => ISO_DATE_RE.test(cleanString(value));

export const toISODate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseISODateSafe = (iso) => {
  const normalized = cleanString(iso).slice(0, 10);
  if (!isISODate(normalized)) return null;

  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (Number.isNaN(date.getTime())) return null;
  if (toISODate(date) !== normalized) return null;
  return date;
};

export const addMonthsISODate = (isoDate, months = 1) => {
  const date = parseISODateSafe(isoDate);
  if (!date) return '';
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
  next.setMonth(next.getMonth() + Number(months || 0));
  return toISODate(next);
};

export const minISODate = (left, right) => {
  if (!left) return right || '';
  if (!right) return left || '';
  return left <= right ? left : right;
};

export const maxISODate = (left, right) => {
  if (!left) return right || '';
  if (!right) return left || '';
  return left >= right ? left : right;
};

export const clampISODate = (value, minDate = '', maxDate = '') => {
  const normalized = isISODate(value) ? value : '';
  if (!normalized) return '';

  const boundedMin = maxISODate(normalized, minDate || '');
  return minISODate(boundedMin, maxDate || '');
};

const getGroupScheduleArrays = (scheduleOrGroup) => {
  if (Array.isArray(scheduleOrGroup)) return [scheduleOrGroup];
  if (!scheduleOrGroup || typeof scheduleOrGroup !== 'object') return [];

  const root = scheduleOrGroup;
  const raw = root.raw && typeof root.raw === 'object' ? root.raw : {};

  const candidates = [
    root.schedule,
    root.group_schedule,
    root.training_days,
    root.days,
    raw.schedule,
    raw.group_schedule,
    raw.training_days,
    raw.days,
  ];

  return candidates.filter((candidate) => Array.isArray(candidate));
};

export const dayNameToJsWeekday = (dayName) => {
  if (typeof dayName === 'number' && Number.isInteger(dayName) && dayName >= 0 && dayName <= 6) {
    return dayName;
  }

  if (dayName == null) return null;

  const raw = cleanString(dayName);
  if (!raw) return null;

  const numeric = Number(raw);
  if (Number.isInteger(numeric) && numeric >= 0 && numeric <= 6) {
    return numeric;
  }

  const normalized = raw.toLowerCase().replace(/[\s_-]+/g, '');
  return Object.prototype.hasOwnProperty.call(DAY_NAME_TO_WEEKDAY, normalized)
    ? DAY_NAME_TO_WEEKDAY[normalized]
    : null;
};

export const getScheduleWeekdays = (schedule) => {
  const weekdays = new Set();
  const arrays = getGroupScheduleArrays(schedule);

  arrays.forEach((rows) => {
    rows.forEach((item) => {
      const candidate =
        typeof item === 'object' && item !== null
          ? item.weekday ?? item.day ?? item.name ?? item.day_name
          : item;
      const weekday = dayNameToJsWeekday(candidate);
      if (weekday != null) weekdays.add(weekday);
    });
  });

  return weekdays;
};

export const listScheduledOccurrencesInRange = (startISO, endISO, schedule) => {
  const start = parseISODateSafe(startISO);
  const end = parseISODateSafe(endISO);
  if (!start || !end || end < start) return [];

  const weekdays = getScheduleWeekdays(schedule);
  if (!weekdays.size) return [];

  const rows = [];
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    if (weekdays.has(cursor.getDay())) {
      rows.push(toISODate(cursor));
    }
  }

  return rows;
};

const normalizeISODateString = (value) => {
  if (value instanceof Date) return toISODate(value);
  const raw = cleanString(value).slice(0, 10);
  if (!isISODate(raw)) return '';
  const parsed = parseISODateSafe(raw);
  return parsed ? toISODate(parsed) : '';
};

const getCourseWindow = (course) => {
  const startISO = normalizeISODateString(course?.start_date || course?.startDate);
  const endISO = normalizeISODateString(course?.end_date || course?.endDate);
  if (!startISO || !endISO || startISO > endISO) return { startISO: '', endISO: '' };
  return { startISO, endISO };
};

const getCourseTotalSessions = (course) => {
  const raw =
    Number(
      course?.num_of_sessions ??
        course?.max_num_of_sessions ??
        course?.number_of_sessions ??
        course?.total_sessions ??
        0
    ) || 0;

  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.floor(raw);
};

export const getCourseActiveOccurrenceDates = (course, group) => {
  const { startISO, endISO } = getCourseWindow(course);
  const totalSessions = getCourseTotalSessions(course);
  if (!startISO || !endISO || totalSessions <= 0) return [];

  const allScheduled = listScheduledOccurrencesInRange(startISO, endISO, group);
  if (!allScheduled.length) return [];

  return allScheduled.slice(0, totalSessions);
};

export const getMaxSelectableEndDate = (course) => {
  return normalizeISODateString(course?.end_date || course?.endDate);
};

export const clampCourseStartDate = (course, chosenStartISO) => {
  const { startISO, endISO } = getCourseWindow(course);
  const pickedISO = normalizeISODateString(chosenStartISO);

  if (!startISO && !endISO) return pickedISO;
  if (!pickedISO) return startISO || endISO || '';
  if (startISO && pickedISO < startISO) return startISO;
  if (endISO && pickedISO > endISO) return endISO;
  return pickedISO;
};

export const getConsumedSessionsBeforeDate = (course, group, chosenStartISO) => {
  const activeDates = getCourseActiveOccurrenceDates(course, group);
  if (!activeDates.length) return 0;

  const startISO = clampCourseStartDate(course, chosenStartISO);
  if (!startISO) return 0;

  return activeDates.filter((dateISO) => dateISO < startISO).length;
};

export const getRemainingAllowedSessions = (course, group, chosenStartISO) => {
  const activeDates = getCourseActiveOccurrenceDates(course, group);
  if (!activeDates.length) return 0;

  const startISO = clampCourseStartDate(course, chosenStartISO);
  if (!startISO) return activeDates.length;

  return activeDates.filter((dateISO) => dateISO >= startISO).length;
};

export const getEndDateForSessionCount = (course, group, chosenStartISO, sessionCount) => {
  const activeDates = getCourseActiveOccurrenceDates(course, group);
  if (!activeDates.length) return '';

  const startISO = clampCourseStartDate(course, chosenStartISO);
  const availableDates = startISO
    ? activeDates.filter((dateISO) => dateISO >= startISO)
    : activeDates.slice();
  if (!availableDates.length) return '';

  const count = Math.floor(Number(sessionCount) || 0);
  if (!Number.isFinite(count) || count <= 0) return '';

  const clampedCount = Math.max(1, Math.min(count, availableDates.length));
  return availableDates[clampedCount - 1] || '';
};

export const getSessionCountForEndDate = (course, group, chosenStartISO, chosenEndISO) => {
  const activeDates = getCourseActiveOccurrenceDates(course, group);
  if (!activeDates.length) return 0;

  const startISO = clampCourseStartDate(course, chosenStartISO);
  const endISO = normalizeISODateString(chosenEndISO);
  if (!endISO) return 0;

  return activeDates.filter(
    (dateISO) => (!startISO || dateISO >= startISO) && dateISO <= endISO
  ).length;
};

export const getCourseRenewalOrRegistrationSummary = (
  course,
  group,
  chosenStartISO,
  chosenEndISO = ''
) => {
  const activeOccurrenceDates = getCourseActiveOccurrenceDates(course, group);
  const clampedStartISO = clampCourseStartDate(course, chosenStartISO);
  const maxSelectableEndDate = getMaxSelectableEndDate(course);
  const lastActiveOccurrenceDate = activeOccurrenceDates[activeOccurrenceDates.length - 1] || '';

  const consumedBeforeStart = clampedStartISO
    ? activeOccurrenceDates.filter((dateISO) => dateISO < clampedStartISO).length
    : 0;

  const remainingAllowedSessions = clampedStartISO
    ? activeOccurrenceDates.filter((dateISO) => dateISO >= clampedStartISO).length
    : activeOccurrenceDates.length;

  const countedSessionsToChosenEnd = chosenEndISO
    ? getSessionCountForEndDate(course, group, clampedStartISO, chosenEndISO)
    : 0;

  const effectiveSessionCount = chosenEndISO ? countedSessionsToChosenEnd : remainingAllowedSessions;
  const effectiveEndDateForCurrentSessionCount =
    effectiveSessionCount > 0
      ? getEndDateForSessionCount(course, group, clampedStartISO, effectiveSessionCount)
      : '';

  return {
    activeOccurrenceDates,
    consumedBeforeStart,
    remainingAllowedSessions,
    maxSelectableEndDate,
    lastActiveOccurrenceDate,
    effectiveEndDateForCurrentSessionCount,
    countedSessionsToChosenEnd,
  };
};

export const countSessionsInclusive = (startISO, endISO, schedule) => {
  const start = parseISODateSafe(startISO);
  const end = parseISODateSafe(endISO);
  if (!start || !end || end < start) return 0;

  const weekdays = getScheduleWeekdays(schedule);
  if (!weekdays.size) return 0;

  let count = 0;
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    if (weekdays.has(cursor.getDay())) count += 1;
  }

  return count;
};

export const getEarliestEndForSessions = (startISO, targetSessions, schedule, hardEndISO = '') => {
  const start = parseISODateSafe(startISO);
  if (!start) return '';

  const target = Math.floor(Number(targetSessions) || 0);
  if (!Number.isFinite(target) || target <= 0) return '';

  const weekdays = getScheduleWeekdays(schedule);
  if (!weekdays.size) return '';

  const hardEnd = hardEndISO ? parseISODateSafe(hardEndISO) : null;
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 12, 0, 0, 0);
  let remaining = target;

  while (true) {
    if (weekdays.has(cursor.getDay())) {
      remaining -= 1;
      if (remaining <= 0) return toISODate(cursor);
    }

    cursor.setDate(cursor.getDate() + 1);
    if (hardEnd && cursor > hardEnd) return '';
  }
};

export const normalizeSessionInput = (value) => {
  const parsed = Number.parseInt(cleanString(value), 10);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
};
