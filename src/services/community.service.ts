import mongoose from 'mongoose';
import CommunityProfile, { ICommunityProfile, CommunityLevel } from '../models/CommunityProfile';
import BrewLog from '../models/BrewLog';
import Follow from '../models/follow.model';
import Certification from '../models/certification.model';
import { createNotification } from './notification.service';
import {
  BADGE_DEFINITIONS,
  LEVEL_THRESHOLDS,
  POINTS,
  levelForPoints,
} from '../constants/badges';

export async function getOrCreateProfile(userId: string): Promise<ICommunityProfile> {
  const existing = await CommunityProfile.findOne({ userId });
  if (existing) return existing;
  return CommunityProfile.create({ userId: new mongoose.Types.ObjectId(userId) });
}

export async function awardPoints(
  userId: string,
  points: number,
  _reason: string
): Promise<void> {
  try {
    const profile = await getOrCreateProfile(userId);
    const oldLevel = profile.level;
    profile.levelPoints += points;
    const newLevel = levelForPoints(profile.levelPoints);

    if (newLevel !== oldLevel) {
      profile.level = newLevel;
      createNotification({
        userId,
        type: 'general',
        title: 'Level Up! 🎉',
        body: `You reached ${formatLevel(newLevel)}!`,
      }).catch(() => {});
    }

    await profile.save();
  } catch (err) {
    console.error('[community.service] awardPoints error:', err);
  }
}

export async function checkAndAwardBadges(userId: string): Promise<string[]> {
  try {
    const profile = await getOrCreateProfile(userId);
    const earnedIds = new Set(profile.badges.map((b) => b.badgeId));
    const newlyEarned: string[] = [];

    const [brewLogs, followersCount, certCount] = await Promise.all([
      BrewLog.find({ user: userId }).lean(),
      Follow.countDocuments({ following: userId }),
      Certification.countDocuments({ user: userId, status: 'active' }),
    ]);

    const totalBrews = brewLogs.length;

    // Count by brew method name (populated elsewhere; use brewMethod field)
    // We aggregate method names by looking at populated data if available;
    // since BrewLog.brewMethod is an ObjectId, we group by it as a proxy.
    const methodCounts: Record<string, number> = {};
    for (const log of brewLogs) {
      const key = log.brewMethod?.toString() ?? '';
      methodCounts[key] = (methodCounts[key] ?? 0) + 1;
    }

    // Check brew-method badges by name from profile
    const v60Brews = profile.brewMethodsLearned.includes('V60')
      ? brewLogs.filter((l) => {
          const k = l.brewMethod?.toString() ?? '';
          return methodCounts[k] !== undefined;
        }).length
      : 0;

    // Taste-note based: matcha
    const matchaCount = profile.coffeesTriedNames.filter((n) =>
      n.toLowerCase().includes('matcha')
    ).length;

    const conditions: Record<string, boolean> = {
      first_brew: totalBrews >= 1,
      brews_10: totalBrews >= 10,
      brews_50: totalBrews >= 50,
      brews_100: totalBrews >= 100,
      social_butterfly: profile.totalLikesReceived >= 50,
      first_follower: followersCount >= 1,
      store_explorer: profile.storesVisited.length >= 3,
      certified: certCount >= 1,
      matcha_specialist: matchaCount >= 5,
    };

    for (const [badgeId, met] of Object.entries(conditions)) {
      if (met && !earnedIds.has(badgeId)) {
        const def = BADGE_DEFINITIONS[badgeId];
        if (!def) continue;
        profile.badges.push({
          badgeId,
          name: def.name,
          description: def.description,
          icon: def.icon,
          category: def.category,
          earnedAt: new Date(),
        });
        newlyEarned.push(badgeId);
        earnedIds.add(badgeId);

        createNotification({
          userId,
          type: 'general',
          title: `Badge Earned! ${def.icon}`,
          body: `You earned the "${def.name}" badge`,
        }).catch(() => {});
      }
    }

    if (newlyEarned.length > 0) {
      await profile.save();
      // Award points for each badge in fire-and-forget
      for (const _id of newlyEarned) {
        awardPoints(userId, POINTS.badge_earned, 'badge').catch(() => {});
      }
    }

    return newlyEarned;
  } catch (err) {
    console.error('[community.service] checkAndAwardBadges error:', err);
    return [];
  }
}

function formatLevel(level: CommunityLevel): string {
  return level
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export { POINTS };
