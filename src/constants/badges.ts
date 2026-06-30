import type { BadgeCategory, CommunityLevel } from '../models/CommunityProfile';

export interface BadgeDefinition {
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
}

export const BADGE_DEFINITIONS: Record<string, BadgeDefinition> = {
  first_brew: {
    name: 'First Brew',
    description: 'Logged your first brew',
    icon: '☕',
    category: 'milestone',
  },
  brews_10: {
    name: '10 Brews',
    description: 'Logged 10 brews',
    icon: '🔟',
    category: 'milestone',
  },
  brews_50: {
    name: '50 Brews',
    description: 'Logged 50 brews',
    icon: '🏅',
    category: 'milestone',
  },
  brews_100: {
    name: '100 Brews',
    description: 'Logged 100 brews',
    icon: '💯',
    category: 'milestone',
  },
  v60_expert: {
    name: 'V60 Expert',
    description: 'Logged 20+ V60 brews',
    icon: '🌀',
    category: 'brewing',
  },
  aeropress_master: {
    name: 'AeroPress Master',
    description: 'Logged 20+ AeroPress brews',
    icon: '🔵',
    category: 'brewing',
  },
  matcha_specialist: {
    name: 'Matcha Specialist',
    description: 'Tried 5+ matcha recipes',
    icon: '🍵',
    category: 'brewing',
  },
  social_butterfly: {
    name: 'Social Butterfly',
    description: 'Received 50+ likes',
    icon: '🦋',
    category: 'social',
  },
  first_follower: {
    name: 'First Follower',
    description: 'Got your first follower',
    icon: '👥',
    category: 'social',
  },
  store_explorer: {
    name: 'Store Explorer',
    description: 'Visited 3+ Java Times stores',
    icon: '🗺️',
    category: 'exploration',
  },
  passport_stamped: {
    name: 'Passport Stamped',
    description: 'Visited all open stores',
    icon: '✈️',
    category: 'exploration',
  },
  certified: {
    name: 'Certified',
    description: 'Earned your first JavaRista cert',
    icon: '🏆',
    category: 'certification',
  },
};

export const LEVEL_THRESHOLDS: Record<CommunityLevel, number> = {
  explorer: 0,
  enthusiast: 100,
  brewer: 300,
  advanced_brewer: 700,
  coffee_expert: 1500,
  master_javarista: 3000,
};

export const POINTS = {
  brew_logged: 10,
  brew_liked_received: 5,
  follower_gained: 3,
  cert_earned: 50,
  store_visited: 20,
  badge_earned: 25,
} as const;

export function levelForPoints(points: number): CommunityLevel {
  const levels: CommunityLevel[] = [
    'master_javarista',
    'coffee_expert',
    'advanced_brewer',
    'brewer',
    'enthusiast',
    'explorer',
  ];
  for (const level of levels) {
    if (points >= LEVEL_THRESHOLDS[level]) return level;
  }
  return 'explorer';
}
