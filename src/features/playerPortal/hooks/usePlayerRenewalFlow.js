import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { playerPortalApi } from '../api/playerPortal.api';
import {
  addMonthsISODate,
  clampCourseStartDate,
  clampISODate,
  countSessionsInclusive,
  getCourseRenewalOrRegistrationSummary,
  getEarliestEndForSessions,
  getEndDateForSessionCount,
  getMaxSelectableEndDate,
  getRemainingAllowedSessions,
  getScheduleWeekdays,
  getSessionCountForEndDate,
  isISODate,
  maxISODate,
} from '../utils/playerPortal.courseSchedule';
import { getNextRenewalStartDate, toLocalISODate } from '../utils/playerPortal.renewalDates';
import { toNumber, toObject } from '../utils/playerPortal.normalizers';
import { usePlayerOverview } from './usePlayerOverview';
import { usePlayerPortalSession } from './usePlayerPortalSession';
import { usePortalQueryState } from './usePortalQueryState';

const STEPS = Object.freeze({
  TYPE: 0,
  OPTIONS: 1,
  DATES: 2,
  REVIEW: 3,
});

const LAST_EDITED = Object.freeze({
  NONE: 'none',
  START: 'start',
  END: 'end',
  SESSIONS: 'sessions',
});

const DEFAULT_ELIGIBILITY = Object.freeze({
  eligible: false,
  daysLeft: null,
  endDate: '',
  hasPendingRequest: false,
});

const DEFAULT_OPTIONS = Object.freeze({
  eligible: false,
  daysLeft: null,
  currentEnd: '',
  courses: [],
  groups: [],
  levels: [],
  currentRegistration: null,
  raw: null,
});

const normalizeLevel = (value) => {
  if (value == null) return '';
  return String(value).trim();
};

const toIdString = (value) => {
  if (value == null || value === '') return '';
  return String(value);
};

const sameId = (left, right) => toIdString(left) === toIdString(right);

const getGroupCourseId = (group) => {
  return toNumber(group?.course_id || group?.courseId || group?.course?.id);
};

const pickCurrentRegistration = (overview, optionsData) => {
  const fromOptions = toObject(optionsData?.currentRegistration);
  if (Object.keys(fromOptions).length > 0) {
    return {
      id: toNumber(fromOptions.id),
      registration_type: fromOptions.registration_type || overview?.subscription?.registrationType || 'subscription',
      start_date: String(fromOptions.start_date || overview?.subscription?.startDate || '').slice(0, 10),
      end_date: String(fromOptions.end_date || overview?.subscription?.endDate || '').slice(0, 10),
      number_of_sessions:
        toNumber(fromOptions.number_of_sessions) || toNumber(overview?.subscription?.numberOfSessions) || 0,
      group_id: toNumber(fromOptions.group_id || overview?.subscription?.groupId),
      group_name: fromOptions.group_name || overview?.subscription?.groupName || '',
      course_id: toNumber(fromOptions.course_id || overview?.subscription?.courseId),
      course_name: fromOptions.course_name || overview?.subscription?.courseName || '',
      level: normalizeLevel(fromOptions.level || overview?.subscription?.level || ''),
    };
  }

  return {
    id: toNumber(overview?.subscription?.id || overview?.subscription?.currentRegId),
    registration_type: overview?.subscription?.registrationType || 'subscription',
    start_date: String(overview?.subscription?.startDate || '').slice(0, 10),
    end_date: String(overview?.subscription?.endDate || '').slice(0, 10),
    number_of_sessions: toNumber(overview?.subscription?.numberOfSessions) || 0,
    group_id: toNumber(overview?.subscription?.groupId),
    group_name: overview?.subscription?.groupName || '',
    course_id: toNumber(overview?.subscription?.courseId),
    course_name: overview?.subscription?.courseName || '',
    level: normalizeLevel(overview?.subscription?.level || ''),
  };
};

const normalizeCourseOption = (course) => {
  const row = toObject(course);
  const id = toNumber(row.id || row.value || row.course_id);
  return {
    id,
    value: toIdString(row.value || id),
    label: String(row.label || row.course_name || row.name || `#${id || ''}`),
    start_date: String(row.start_date || row.startDate || '').slice(0, 10),
    end_date: String(row.end_date || row.endDate || '').slice(0, 10),
    num_of_sessions: toNumber(row.num_of_sessions || row.number_of_sessions),
    raw: row,
  };
};

const normalizeGroupOption = (group) => {
  const row = toObject(group);
  const id = toNumber(row.id || row.value || row.group_id);
  return {
    id,
    value: toIdString(row.value || id),
    label: String(row.label || row.name || row.group_name || `#${id || ''}`),
    course_id: getGroupCourseId(row),
    schedule: Array.isArray(row.schedule) ? row.schedule : [],
    raw: row,
  };
};

const normalizeLevelOption = (level, index) => {
  const row = toObject(level);
  const key = normalizeLevel(row.key || row.value || row.id || index + 1);
  return {
    key,
    value: key,
    label_en: normalizeLevel(row.label_en || row.labelEn || row.label || key),
    label_ar: normalizeLevel(row.label_ar || row.labelAr || row.label || key),
    raw: row,
  };
};

const filterCoursesAroundAnchor = (courses, anchorISO) => {
  return courses.filter((course) => {
    const start = String(course.start_date || '').slice(0, 10);
    const end = String(course.end_date || '').slice(0, 10);
    const hasStart = isISODate(start);
    const hasEnd = isISODate(end);

    const activeAtAnchor = (!hasStart || start <= anchorISO) && (!hasEnd || end >= anchorISO);
    const upcomingFromAnchor = hasStart && start >= anchorISO;
    return activeAtAnchor || upcomingFromAnchor;
  });
};

const clampSessions = (value, min, max) => {
  const numeric = Number(value);
  const safe = Number.isFinite(numeric) ? Math.trunc(numeric) : min;
  return Math.max(min, Math.min(max, safe));
};

export function usePlayerRenewalFlow({ auto = true } = {}) {
  const session = usePlayerPortalSession();
  const overviewQuery = usePlayerOverview({ auto, enabled: auto });

  const eligibilityQuery = usePortalQueryState(DEFAULT_ELIGIBILITY);
  const optionsQuery = usePortalQueryState(DEFAULT_OPTIONS);
  const runEligibilityQuery = eligibilityQuery.run;
  const runOptionsQuery = optionsQuery.run;
  const initializedRef = useRef(false);

  const [step, setStep] = useState(STEPS.TYPE);
  const [renewType, setRenewType] = useState('subscription');
  const [courseId, setCourseId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [numSessions, setNumSessions] = useState(12);
  const [playerNote, setPlayerNote] = useState('');
  const [level, setLevel] = useState('');
  const [lastEdited, setLastEdited] = useState(LAST_EDITED.NONE);
  const [submitState, setSubmitState] = useState({
    isSubmitting: false,
    error: null,
    successMessage: '',
  });

  const todayISO = toLocalISODate(new Date());
  const currentRegistration = useMemo(
    () => pickCurrentRegistration(overviewQuery.overview, optionsQuery.data),
    [optionsQuery.data, overviewQuery.overview]
  );

  const anchorStartISO = useMemo(
    () => getNextRenewalStartDate(currentRegistration, null, todayISO),
    [currentRegistration, todayISO]
  );

  const anchorISO = useMemo(() => {
    const endDateIso = String(currentRegistration.end_date || '').slice(0, 10);
    return isISODate(endDateIso) ? endDateIso : todayISO;
  }, [currentRegistration.end_date, todayISO]);

  const rawCourseOptions = useMemo(() => {
    if ((optionsQuery.data?.courses || []).length > 0) {
      return optionsQuery.data.courses.map(normalizeCourseOption);
    }

    return (overviewQuery.overview?.subscription?.availableCourses || []).map(normalizeCourseOption);
  }, [optionsQuery.data?.courses, overviewQuery.overview?.subscription?.availableCourses]);

  const rawGroupOptions = useMemo(() => {
    if ((optionsQuery.data?.groups || []).length > 0) {
      return optionsQuery.data.groups.map(normalizeGroupOption);
    }

    return (overviewQuery.overview?.subscription?.availableGroups || []).map(normalizeGroupOption);
  }, [optionsQuery.data?.groups, overviewQuery.overview?.subscription?.availableGroups]);

  const levelOptions = useMemo(() => {
    if ((optionsQuery.data?.levels || []).length > 0) {
      return optionsQuery.data.levels.map(normalizeLevelOption);
    }

    return (overviewQuery.overview?.levels || []).map(normalizeLevelOption);
  }, [optionsQuery.data?.levels, overviewQuery.overview?.levels]);

  const filteredCourseOptions = useMemo(
    () => filterCoursesAroundAnchor(rawCourseOptions, anchorISO),
    [anchorISO, rawCourseOptions]
  );

  const selectedCourse = useMemo(
    () => filteredCourseOptions.find((item) => sameId(item.value, courseId)) || null,
    [courseId, filteredCourseOptions]
  );

  const filteredGroupOptions = useMemo(() => {
    if (renewType === 'course') {
      return rawGroupOptions.filter((group) => sameId(getGroupCourseId(group), courseId));
    }

    return rawGroupOptions.filter((group) => {
      const courseValue = getGroupCourseId(group);
      return courseValue == null;
    });
  }, [courseId, rawGroupOptions, renewType]);

  const selectedGroup = useMemo(
    () => filteredGroupOptions.find((item) => sameId(item.value, groupId)) || null,
    [filteredGroupOptions, groupId]
  );

  const cStartISO = selectedCourse?.start_date || '';
  const cEndISO = getMaxSelectableEndDate(selectedCourse);

  const sessionsCap = useMemo(() => {
    if (renewType !== 'course') return 365;
    if (!selectedCourse) return 0;

    const courseStartMin = cStartISO ? maxISODate(cStartISO, anchorStartISO) : anchorStartISO;
    const clampedToCourse = clampCourseStartDate(
      selectedCourse,
      startDate || courseStartMin || cStartISO || ''
    );
    const chosenStartISO = courseStartMin
      ? maxISODate(clampedToCourse || courseStartMin, courseStartMin)
      : clampedToCourse;

    return getRemainingAllowedSessions(selectedCourse, selectedGroup, chosenStartISO);
  }, [anchorStartISO, cStartISO, renewType, selectedCourse, selectedGroup, startDate]);

  const bounds = useMemo(() => {
    const courseStartMin = cStartISO ? maxISODate(cStartISO, anchorStartISO) : anchorStartISO;

    const startMin = renewType === 'course' ? courseStartMin || '' : anchorStartISO || '';
    const startMax = renewType === 'course' ? cEndISO || '' : '';

    const endMin =
      renewType === 'course'
        ? startDate || courseStartMin || cStartISO || anchorStartISO || ''
        : startDate || anchorStartISO || '';

    const endMax = renewType === 'course' ? cEndISO || '' : '';

    return {
      startMin,
      startMax,
      endMin,
      endMax,
    };
  }, [anchorStartISO, cEndISO, cStartISO, renewType, startDate]);

  const fetchRenewalBootstrap = useCallback(
    async ({ refresh = false } = {}) => {
      if (!session.canFetchOverview || !session.requestContext) {
        return {
          success: false,
          error: {
            code: session.guardReason || 'RENEWAL_GUARD_FAILED',
            status: 0,
            message: 'Player session is not ready for renewal requests.',
          },
        };
      }

      const runEligibility = runEligibilityQuery(
        async () => {
          const result = await playerPortalApi.getRenewalEligibility(session.requestContext, {});
          if (!result.success) {
            throw result.error;
          }
          return result.data;
        },
        { refresh }
      );

      const runOptions = runOptionsQuery(
        async () => {
          const result = await playerPortalApi.getRenewalOptions(session.requestContext, {});
          if (!result.success) {
            throw result.error;
          }
          return result.data;
        },
        { refresh }
      );

      const [eligibilityResult, optionsResult] = await Promise.all([runEligibility, runOptions]);

      if (!eligibilityResult.success && !optionsResult.success) {
        return {
          success: false,
          error: optionsResult.error || eligibilityResult.error,
        };
      }

      return {
        success: true,
        data: {
          eligibility: eligibilityResult.success ? eligibilityResult.data : eligibilityQuery.data,
          options: optionsResult.success ? optionsResult.data : optionsQuery.data,
        },
      };
    },
    [
      eligibilityQuery.data,
      optionsQuery.data,
      runEligibilityQuery,
      runOptionsQuery,
      session.canFetchOverview,
      session.guardReason,
      session.requestContext,
    ]
  );

  useEffect(() => {
    if (!auto) return;
    if (!session.canFetchOverview || !session.requestContext) return;
    if (eligibilityQuery.error || optionsQuery.error) return;
    if (eligibilityQuery.isLoading || optionsQuery.isLoading) return;
    if (optionsQuery.lastUpdatedAt && eligibilityQuery.lastUpdatedAt) return;
    fetchRenewalBootstrap();
  }, [
    auto,
    eligibilityQuery.error,
    eligibilityQuery.isLoading,
    eligibilityQuery.lastUpdatedAt,
    fetchRenewalBootstrap,
    optionsQuery.error,
    optionsQuery.isLoading,
    optionsQuery.lastUpdatedAt,
    session.canFetchOverview,
    session.requestContext,
  ]);

  useEffect(() => {
    if (!overviewQuery.overview) return;
    if (initializedRef.current) return;

    initializedRef.current = true;
    setStep(STEPS.TYPE);
    setRenewType('subscription');
    setCourseId('');
    setGroupId(toIdString(currentRegistration.group_id));
    setStartDate(anchorStartISO || todayISO);
    setEndDate('');
    setNumSessions(12);
    setPlayerNote('');
    setLevel(normalizeLevel(currentRegistration.level));
    setLastEdited(LAST_EDITED.NONE);
  }, [anchorStartISO, currentRegistration.group_id, currentRegistration.level, overviewQuery.overview, todayISO]);

  useEffect(() => {
    if (!courseId) return;
    const valid = filteredCourseOptions.some((item) => sameId(item.value, courseId));
    if (!valid) setCourseId('');
  }, [courseId, filteredCourseOptions]);

  useEffect(() => {
    if (!groupId) return;
    const valid = filteredGroupOptions.some((item) => sameId(item.value, groupId));
    if (!valid) setGroupId('');
  }, [filteredGroupOptions, groupId]);

  useEffect(() => {
    if (!groupId) return;
    if (renewType !== 'subscription') return;

    const startOk = isISODate(startDate);
    const startISO = startOk ? startDate : todayISO;
    if (!startOk) setStartDate(startISO);

    if (!endDate) {
      const nextEndISO = addMonthsISODate(startISO, 1);
      if (nextEndISO) setEndDate(nextEndISO);
    }
  }, [endDate, groupId, renewType, startDate, todayISO]);

  useEffect(() => {
    if (renewType !== 'subscription') return;

    const startOk = isISODate(startDate);
    const nextStartISO = startOk ? maxISODate(startDate, anchorStartISO) : anchorStartISO || todayISO;
    if (!startOk) setStartDate(nextStartISO);

    if (!endDate) {
      const seededEndDate = addMonthsISODate(nextStartISO, 1);
      if (seededEndDate) setEndDate(seededEndDate);
    }

    const hasSchedule = getScheduleWeekdays(selectedGroup).size > 0;
    if (!hasSchedule) return;

    const startIso = isISODate(nextStartISO) ? nextStartISO : '';
    const endIso = isISODate(endDate) ? endDate : '';
    if (!startIso || !endIso) return;

    const currentSessions = Number(numSessions || 0);
    if (currentSessions > 0 && currentSessions <= sessionsCap) return;

    const counted = countSessionsInclusive(startIso, endIso, selectedGroup);
    const clamped = clampSessions(counted, 1, sessionsCap);
    setNumSessions(clamped);
  }, [anchorStartISO, endDate, numSessions, renewType, selectedGroup, sessionsCap, startDate, todayISO]);

  useEffect(() => {
    if (renewType === 'course') {
      if (!selectedCourse) return;

      const courseStartMin = cStartISO ? maxISODate(cStartISO, anchorStartISO) : anchorStartISO;
      const clampedToCourse = clampCourseStartDate(
        selectedCourse,
        startDate || courseStartMin || cStartISO || ''
      );

      const startISO = courseStartMin
        ? maxISODate(clampedToCourse || courseStartMin, courseStartMin)
        : clampedToCourse;

      const boundedStartISO = cEndISO
        ? clampISODate(startISO || courseStartMin, courseStartMin || startISO, cEndISO)
        : startISO || courseStartMin || '';

      const hasChosenEnd = Boolean(endDate);
      const boundedEndISO = cEndISO
        ? clampISODate(endDate || cEndISO || boundedStartISO, boundedStartISO, cEndISO)
        : endDate || boundedStartISO;

      const summary = getCourseRenewalOrRegistrationSummary(
        selectedCourse,
        selectedGroup,
        boundedStartISO,
        boundedEndISO
      );

      const maxSessions = summary.remainingAllowedSessions;
      const minSessions = maxSessions > 0 ? 1 : 0;
      const editMode = lastEdited || LAST_EDITED.NONE;

      const parsedSessions = Number.parseInt(String(numSessions ?? ''), 10);
      const hasFiniteSessions = Number.isFinite(parsedSessions);

      const clampByRange = (value, fallback = minSessions) => {
        const safeValue = Number.isFinite(value) ? value : fallback;
        return Math.max(minSessions, Math.min(maxSessions, safeValue));
      };

      const deriveEndFromSessions = (sessionCount) => {
        if (sessionCount === 0) return '';
        let derivedEndISO = getEndDateForSessionCount(
          selectedCourse,
          selectedGroup,
          boundedStartISO,
          sessionCount
        );

        if (!derivedEndISO && sessionCount > 0) derivedEndISO = boundedEndISO;
        return derivedEndISO || '';
      };

      let nextSessions = clampByRange(parsedSessions, minSessions);
      let nextEndISO = boundedEndISO;
      const shouldPreserveChosenEnd =
        editMode === LAST_EDITED.END ||
        ((editMode === LAST_EDITED.START || editMode === LAST_EDITED.NONE) && hasChosenEnd);

      if (shouldPreserveChosenEnd) {
        nextSessions = getSessionCountForEndDate(
          selectedCourse,
          selectedGroup,
          boundedStartISO,
          boundedEndISO
        );
        nextSessions = clampByRange(nextSessions, minSessions);
        nextEndISO = boundedEndISO;
      } else {
        if (
          editMode === LAST_EDITED.NONE &&
          (!hasFiniteSessions || parsedSessions < minSessions || parsedSessions > maxSessions)
        ) {
          nextSessions = maxSessions;
        } else {
          nextSessions = clampByRange(parsedSessions, minSessions);
        }

        nextEndISO = deriveEndFromSessions(nextSessions);
      }

      if (boundedStartISO && boundedStartISO !== startDate) {
        setStartDate(boundedStartISO);
      }

      if ((nextEndISO || '') !== (endDate || '')) {
        setEndDate(nextEndISO || '');
      }

      if (nextSessions !== Number(numSessions || 0)) {
        setNumSessions(nextSessions);
      }

      if (editMode !== LAST_EDITED.NONE) {
        setLastEdited(LAST_EDITED.NONE);
      }

      return;
    }

    const weekdays = getScheduleWeekdays(selectedGroup);
    if (!weekdays.size) return;

    const startISO = maxISODate(startDate || '', anchorStartISO);
    if (!isISODate(startISO)) return;

    const maxSessions = sessionsCap;

    if (lastEdited === LAST_EDITED.START) {
      const current = Number(numSessions || 0);
      const clampedValue = clampSessions(current || 1, 1, maxSessions);
      const nextEndISO = getEarliestEndForSessions(startISO, clampedValue, selectedGroup);

      if (startISO !== startDate) setStartDate(startISO);
      if (clampedValue !== current) setNumSessions(clampedValue);
      if (nextEndISO && nextEndISO !== endDate) setEndDate(nextEndISO);
      setLastEdited(LAST_EDITED.NONE);
      return;
    }

    if (lastEdited === LAST_EDITED.SESSIONS) {
      const current = Number(numSessions || 0);
      const clampedValue = clampSessions(current || 1, 1, maxSessions);
      if (clampedValue !== current) setNumSessions(clampedValue);

      const nextEndISO = getEarliestEndForSessions(startISO, clampedValue, selectedGroup);
      if (nextEndISO && nextEndISO !== endDate) setEndDate(nextEndISO);
      setLastEdited(LAST_EDITED.NONE);
      return;
    }

    if (lastEdited === LAST_EDITED.END) {
      const boundedEnd = maxISODate(endDate || '', startISO);
      if (!isISODate(boundedEnd)) {
        setLastEdited(LAST_EDITED.NONE);
        return;
      }

      const count = countSessionsInclusive(startISO, boundedEnd, selectedGroup);
      const clampedCount = clampSessions(count || 1, 1, maxSessions);

      if (boundedEnd !== endDate) setEndDate(boundedEnd);
      if (clampedCount !== Number(numSessions || 0)) setNumSessions(clampedCount);
      setLastEdited(LAST_EDITED.NONE);
      return;
    }

    if (!endDate && Number(numSessions || 0) > 0) {
      const nextEndISO = getEarliestEndForSessions(
        startISO,
        Math.min(Number(numSessions), maxSessions),
        selectedGroup
      );
      if (nextEndISO) setEndDate(nextEndISO);
    }
  }, [
    anchorStartISO,
    cEndISO,
    cStartISO,
    endDate,
    lastEdited,
    numSessions,
    renewType,
    selectedCourse,
    selectedGroup,
    sessionsCap,
    startDate,
  ]);

  const canAdvanceFromType = true;
  const canAdvanceFromOptions = renewType === 'course' ? Boolean(courseId && groupId && level) : Boolean(groupId && level);
  const hasBaseValues = Boolean(startDate && endDate && numSessions && level);
  const hasCourseValues = renewType === 'course' ? Boolean(courseId && groupId) : Boolean(groupId);
  const isValid = hasBaseValues && hasCourseValues;
  const mergedEligibility = {
    eligible: Boolean(eligibilityQuery.data?.eligible ?? optionsQuery.data?.eligible),
    daysLeft: eligibilityQuery.data?.daysLeft ?? optionsQuery.data?.daysLeft ?? null,
    endDate: eligibilityQuery.data?.endDate || optionsQuery.data?.currentEnd || '',
    hasPendingRequest: Boolean(eligibilityQuery.data?.hasPendingRequest),
  };

  const submitRenewalRequest = useCallback(async () => {
    if (!session.canFetchOverview || !session.requestContext) {
      return {
        success: false,
        error: {
          code: session.guardReason || 'RENEWAL_GUARD_FAILED',
          status: 0,
          message: 'Player session is not ready for renewal requests.',
        },
      };
    }

    if (!isValid) {
      return {
        success: false,
        error: {
          code: 'RENEWAL_FORM_INVALID',
          status: 0,
          message: 'Renewal form is incomplete.',
        },
      };
    }

    setSubmitState((prev) => ({ ...prev, isSubmitting: true, error: null, successMessage: '' }));

    const payload = {
      try_out: toNumber(session.requestContext.tryoutId || session.requestContext.externalPlayerId),
      current_reg: currentRegistration.id || null,
      renew_type: renewType,
      course: renewType === 'course' ? toNumber(courseId) : null,
      group: toNumber(groupId),
      start_date: startDate || null,
      end_date: endDate || null,
      number_of_sessions: Number(numSessions),
      level: normalizeLevel(level) || null,
      player_note: playerNote || null,
    };

    const result = await playerPortalApi.createRenewalRequest(session.requestContext, payload);

    if (!result.success) {
      setSubmitState({
        isSubmitting: false,
        error: result.error,
        successMessage: '',
      });
      return result;
    }

    await Promise.all([
      overviewQuery.refetch(),
      fetchRenewalBootstrap({ refresh: true }),
    ]);

    setSubmitState({
      isSubmitting: false,
      error: null,
      successMessage: result.data?.payload?.message || 'Renewal request submitted.',
    });

    return result;
  }, [
    courseId,
    currentRegistration.id,
    endDate,
    fetchRenewalBootstrap,
    groupId,
    isValid,
    level,
    numSessions,
    overviewQuery,
    playerNote,
    renewType,
    session.canFetchOverview,
    session.guardReason,
    session.requestContext,
    startDate,
  ]);

  return {
    step,
    steps: STEPS,
    renewType,
    courseId,
    groupId,
    startDate,
    endDate,
    numSessions,
    playerNote,
    level,
    lastEdited,
    todayISO,
    anchorStartISO,
    anchorISO,
    bounds,
    sessionsCap,
    selectedCourse,
    selectedGroup,
    filteredCourseOptions,
    filteredGroupOptions,
    levelOptions,
    currentRegistration,
    eligibility: mergedEligibility || DEFAULT_ELIGIBILITY,
    options: optionsQuery.data || DEFAULT_OPTIONS,
    optionsError: optionsQuery.error,
    eligibilityError: eligibilityQuery.error,
    isLoadingOptions: optionsQuery.isLoading || eligibilityQuery.isLoading,
    isRefreshingOptions: optionsQuery.isRefreshing || eligibilityQuery.isRefreshing,
    isValid,
    canFetch: session.canFetchOverview,
    guardReason: session.guardReason,
    submitState,
    canAdvanceFromType,
    canAdvanceFromOptions,
    setRenewType,
    setCourseId,
    setGroupId,
    setStartDate: (value) => {
      setLastEdited(LAST_EDITED.START);
      setStartDate(value);
    },
    setEndDate: (value) => {
      setLastEdited(LAST_EDITED.END);
      setEndDate(value);
    },
    setNumSessions: (value) => {
      setLastEdited(LAST_EDITED.SESSIONS);
      setNumSessions(value);
    },
    setPlayerNote,
    setLevel,
    nextStep: () => setStep((current) => Math.min(current + 1, STEPS.REVIEW)),
    prevStep: () => setStep((current) => Math.max(current - 1, STEPS.TYPE)),
    goToStep: (nextStepValue) => {
      const numeric = Number(nextStepValue);
      if (!Number.isFinite(numeric)) return;
      setStep(Math.max(STEPS.TYPE, Math.min(STEPS.REVIEW, Math.trunc(numeric))));
    },
    resetFlow: () => {
      initializedRef.current = true;
      setStep(STEPS.TYPE);
      setRenewType('subscription');
      setCourseId('');
      setGroupId(toIdString(currentRegistration.group_id));
      setStartDate(anchorStartISO || todayISO);
      setEndDate('');
      setNumSessions(12);
      setPlayerNote('');
      setLevel(normalizeLevel(currentRegistration.level));
      setLastEdited(LAST_EDITED.NONE);
      setSubmitState({
        isSubmitting: false,
        error: null,
        successMessage: '',
      });
    },
    submitRenewalRequest,
    refreshRenewalData: () => fetchRenewalBootstrap({ refresh: true }),
  };
}
