import { Image, StyleSheet, View } from 'react-native';
import { CalendarDays, Clock4, UserRound } from 'lucide-react-native';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { useI18n } from '../../../hooks/useI18n';
import { useTheme } from '../../../hooks/useTheme';
import { borderRadius, spacing } from '../../../theme/tokens';
import { getRowDirection } from '../../../utils/rtl';
import {
  formatAcademyAgeRange,
  formatCourseScheduleItem,
  getLocalizedText,
} from '../utils/academyDiscovery.formatters';

export function AcademyCoursesList({ courses = [], copy }) {
  const { colors } = useTheme();
  const { locale, isRTL } = useI18n();

  if (!courses.length) {
    return (
      <Text variant="bodySmall" color={colors.textMuted}>
        {copy?.template?.programsEmpty}
      </Text>
    );
  }

  return (
    <View style={styles.list}>
      {courses.map((course) => {
        const title = getLocalizedText({
          locale,
          valueEn: course.nameEn,
          valueAr: course.nameAr,
        });
        const description = getLocalizedText({
          locale,
          valueEn: course.descriptionEn,
          valueAr: course.descriptionAr,
        });
        const ageRange = formatAcademyAgeRange(course.ageFrom, course.ageTo, locale);

        return (
          <Surface key={course.id || title} variant="soft" padding="md" style={styles.item}>
            <View style={[styles.topRow, { flexDirection: getRowDirection(isRTL) }]}>
              <View style={[styles.posterWrap, { backgroundColor: colors.surface }]}> 
                {course.posterUrl ? (
                  <Image source={{ uri: course.posterUrl }} style={styles.poster} resizeMode="cover" />
                ) : (
                  <CalendarDays size={18} color={colors.textMuted} strokeWidth={2.2} />
                )}
              </View>

              <View style={styles.titleWrap}>
                <Text variant="body" weight="bold">
                  {title}
                </Text>

                {description ? (
                  <Text variant="bodySmall" color={colors.textSecondary} numberOfLines={3}>
                    {description}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={[styles.metaRow, { flexDirection: getRowDirection(isRTL) }]}>
              {course.level ? (
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text variant="caption" color={colors.textSecondary}>
                    {course.level}
                  </Text>
                </View>
              ) : null}

              {course.sportCategory ? (
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text variant="caption" color={colors.textSecondary}>
                    {course.sportCategory}
                  </Text>
                </View>
              ) : null}

              {ageRange ? (
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text variant="caption" color={colors.textSecondary}>
                    {ageRange}
                  </Text>
                </View>
              ) : null}
            </View>

            {course.coaches?.length ? (
              <View style={styles.block}>
                <Text variant="caption" color={colors.textSecondary}>
                  {copy?.labels?.coaches || 'Coaches'}
                </Text>
                <View style={[styles.metaRow, { flexDirection: getRowDirection(isRTL) }]}>
                  {course.coaches.map((coach, index) => (
                    <View
                      key={`${course.id || title}-coach-${index}`}
                      style={[
                        styles.badge,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.surface,
                        },
                      ]}
                    >
                      <View style={[styles.coachRow, { flexDirection: getRowDirection(isRTL) }]}>
                        <UserRound size={12} color={colors.textMuted} strokeWidth={2.3} />
                        <Text variant="caption" color={colors.textSecondary}>
                          {coach}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {course.schedules?.length ? (
              <View style={styles.block}>
                <Text variant="caption" color={colors.textSecondary}>
                  {copy?.labels?.schedules}
                </Text>
                <View style={[styles.scheduleWrap, { flexDirection: getRowDirection(isRTL) }]}>
                  {course.schedules.map((schedule, index) => (
                    <View
                      key={`${course.id || title}-schedule-${index}`}
                      style={[
                        styles.scheduleChip,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.surface,
                        },
                      ]}
                    >
                      <Clock4 size={13} color={colors.accentOrange} strokeWidth={2.2} />
                      <Text variant="caption" color={colors.textSecondary}>
                        {formatCourseScheduleItem(schedule, locale)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </Surface>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  item: {
    gap: spacing.sm,
  },
  topRow: {
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  posterWrap: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  titleWrap: {
    flex: 1,
    gap: 4,
  },
  metaRow: {
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  badge: {
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  coachRow: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  block: {
    gap: spacing.xs,
  },
  scheduleWrap: {
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  scheduleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
});
