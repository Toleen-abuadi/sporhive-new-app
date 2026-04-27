import { StyleSheet, View } from "react-native";
import {
  CalendarDays,
  Globe2,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react-native";
import { Surface } from "../../../components/ui/Surface";
import { Text } from "../../../components/ui/Text";
import { useI18n } from "../../../hooks/useI18n";
import { useTheme } from "../../../hooks/useTheme";
import { borderRadius, spacing } from "../../../theme/tokens";
import { toArray } from "../utils/academyDiscovery.normalizers";

const toClean = (value) => String(value ?? "").trim();

const toCount = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const iconMap = {
  founded: CalendarDays,
  players: Users,
  coaches: ShieldCheck,
  courses: Trophy,
  sports: Trophy,
  languages: Globe2,
};

const buildHighlights = ({ academy, coursesCount = 0, copy }) => {
  const raw = academy?.raw || {};
  const playersCount = toCount(raw.number_of_players || raw.players_count);
  const coachesCount = toCount(raw.number_of_coaches || raw.coaches_count);
  const languagesCount =
    toArray(raw.languages || raw.languages_json).length ||
    toCount(raw.languages_count);
  const foundedYear = toClean(raw.year_founded || raw.founded_year);
  const sportsCount = toArray(academy?.sportTypes).length;

  const rows = [
    {
      key: "founded",
      label: copy?.labels?.founded || "Founded",
      value: foundedYear,
    },
    {
      key: "players",
      label: copy?.labels?.players || "Players",
      value: playersCount != null ? `${playersCount}+` : "",
    },
    {
      key: "coaches",
      label: copy?.labels?.coaches || "Coaches",
      value: coachesCount != null ? String(coachesCount) : "",
    },
    {
      key: "courses",
      label: copy?.labels?.courses || "Courses",
      value: coursesCount > 0 ? String(coursesCount) : "",
    },
    {
      key: "sports",
      label: copy?.labels?.sports || "Sports",
      value: sportsCount > 0 ? String(sportsCount) : "",
    },
    {
      key: "languages",
      label: copy?.labels?.languages || "Languages",
      value: languagesCount ? String(languagesCount) : "",
    },
  ];

  return rows.filter((item) => toClean(item.value));
};

export function AcademyTemplateHighlights({ academy, coursesCount = 0, copy }) {
  const { colors } = useTheme();
  const { isRTL } = useI18n();

  const items = buildHighlights({
    academy,
    coursesCount,
    copy,
  });

  if (!items.length) return null;

  return (
    <View style={styles.grid}>
      {items.map((item) => {
        const Icon = iconMap[item.key] || Trophy;

        return (
          <Surface
            key={item.key}
            variant="soft"
            padding="sm"
            style={styles.item}
          >
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: colors.accentOrangeSoft,
                  alignSelf: isRTL ? "flex-end" : "flex-start", // ✅ FIX
                },
              ]}
            >
              <Icon size={14} color={colors.accentOrange} strokeWidth={2.2} />
            </View>

            <Text
              variant="caption"
              color={colors.textSecondary}
              style={{ textAlign: isRTL ? "right" : "left" }} // ✅ FIX
            >
              {item.label}
            </Text>

            <Text
              variant="body"
              weight="bold"
              style={{ textAlign: isRTL ? "right" : "left" }} // ✅ FIX
            >
              {item.value}
            </Text>
          </Surface>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  item: {
    width: "48%",
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
