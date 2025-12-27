import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Trophy, Award, Star, TrendingUp, Flame, Zap } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { AchievementService, Achievement, UserStats } from '../../services/AchievementService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const iconMap: Record<string, any> = {
  trophy: Trophy,
  award: Award,
  star: Star,
  flame: Flame,
  fire: Flame,
  rocket: Zap,
  activity: TrendingUp,
  'trending-up': TrendingUp,
  droplet: Trophy,
  zap: Zap,
  utensils: Award,
};

export default function AchievementsScreen() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [userAchievements, userStats] = await Promise.all([
        AchievementService.getUserAchievements(user.id),
        AchievementService.getUserStats(user.id),
      ]);

      setAchievements(userAchievements);
      setStats(userStats);
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner />
      </View>
    );
  }

  const allAchievements = Object.values(AchievementService.ACHIEVEMENTS);
  const earnedIds = new Set(achievements.map(a => a.achievement_id));

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Achievements</Text>
          <View style={styles.badge}>
            <Trophy size={20} color="#FFD700" />
            <Text style={styles.badgeText}>{achievements.length}</Text>
          </View>
        </View>

        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Flame size={24} color="#FF6B35" />
              <Text style={styles.statValue}>{stats.current_streak_days}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statCard}>
              <Award size={24} color="#007AFF" />
              <Text style={styles.statValue}>{stats.total_meals_logged}</Text>
              <Text style={styles.statLabel}>Meals Logged</Text>
            </View>
            <View style={styles.statCard}>
              <TrendingUp size={24} color="#34C759" />
              <Text style={styles.statValue}>{Math.floor(stats.total_exercise_minutes / 60)}</Text>
              <Text style={styles.statLabel}>Hours Exercise</Text>
            </View>
            <View style={styles.statCard}>
              <Star size={24} color="#FF9500" />
              <Text style={styles.statValue}>{stats.longest_streak_days}</Text>
              <Text style={styles.statLabel}>Best Streak</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earned ({achievements.length})</Text>
          {achievements.length === 0 ? (
            <View style={styles.emptyState}>
              <Trophy size={48} color="#999" />
              <Text style={styles.emptyText}>No achievements yet</Text>
              <Text style={styles.emptySubtext}>Keep logging to unlock achievements!</Text>
            </View>
          ) : (
            achievements.map((achievement) => {
              const IconComponent = iconMap[achievement.icon] || Trophy;
              return (
                <View key={achievement.id} style={[styles.achievementCard, styles.earnedCard]}>
                  <View style={[styles.iconContainer, styles.earnedIcon]}>
                    <IconComponent size={32} color="#FFD700" />
                  </View>
                  <View style={styles.achievementContent}>
                    <Text style={styles.achievementName}>{achievement.achievement_name}</Text>
                    <Text style={styles.achievementDescription}>
                      {achievement.achievement_description}
                    </Text>
                    <Text style={styles.achievementDate}>
                      Earned {new Date(achievement.earned_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Locked ({allAchievements.length - achievements.length})</Text>
          {allAchievements.filter(a => !earnedIds.has(a.id)).map((achievement) => {
            const IconComponent = iconMap[achievement.icon] || Trophy;
            return (
              <View key={achievement.id} style={[styles.achievementCard, styles.lockedCard]}>
                <View style={[styles.iconContainer, styles.lockedIcon]}>
                  <IconComponent size={32} color="#999" />
                </View>
                <View style={styles.achievementContent}>
                  <Text style={[styles.achievementName, styles.lockedText]}>
                    {achievement.name}
                  </Text>
                  <Text style={[styles.achievementDescription, styles.lockedText]}>
                    {achievement.description}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  badgeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  emptyState: {
    backgroundColor: '#FFF',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  achievementCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  earnedCard: {
    backgroundColor: '#FFF',
  },
  lockedCard: {
    backgroundColor: '#F8F8F8',
    opacity: 0.6,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  earnedIcon: {
    backgroundColor: '#FFF9E6',
  },
  lockedIcon: {
    backgroundColor: '#F0F0F0',
  },
  achievementContent: {
    flex: 1,
    justifyContent: 'center',
  },
  achievementName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    color: '#666',
  },
  achievementDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  lockedText: {
    opacity: 0.7,
  },
});
