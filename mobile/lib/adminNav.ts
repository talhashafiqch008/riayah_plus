import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type AdminIcon = ComponentProps<typeof Ionicons>['name'];

export type AdminNavItem = {
  name: string;
  href: string;
  icon: AdminIcon;
  /** When true, screen is a lightweight placeholder until wired to API */
  placeholder?: boolean;
};

export type AdminNavGroup = {
  title: string;
  items: AdminNavItem[];
};

/** Mirrors mern/client AdminLayout NAVIGATION — paths are Expo routes under (admin). */
export const ADMIN_NAVIGATION: AdminNavGroup[] = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', href: '/(admin)', icon: 'home-outline' },
      { name: 'Analytics', href: '/(admin)/analytics', icon: 'bar-chart-outline' },
    ],
  },
  {
    title: 'Users',
    items: [
      { name: 'Users', href: '/(admin)/users', icon: 'people-outline' },
      { name: 'Families', href: '/(admin)/families', icon: 'home-outline' },
      { name: 'Providers', href: '/(admin)/providers', icon: 'medkit-outline' },
      { name: 'Staff', href: '/(admin)/staff', icon: 'briefcase-outline' },
      { name: 'Verifications', href: '/(admin)/verifications', icon: 'shield-checkmark-outline' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { name: 'Bookings', href: '/(admin)/bookings', icon: 'calendar-outline' },
      { name: 'Payments', href: '/(admin)/payments', icon: 'card-outline' },
      { name: 'Payouts', href: '/(admin)/payouts', icon: 'cash-outline' },
      { name: 'Assignments', href: '/(admin)/assignments', icon: 'clipboard-outline' },
      { name: 'Sessions', href: '/(admin)/sessions', icon: 'time-outline' },
      { name: 'GPS Monitor', href: '/(admin)/gps', icon: 'location-outline' },
    ],
  },
  {
    title: 'Compliance',
    items: [
      { name: 'Documents', href: '/(admin)/documents', icon: 'document-text-outline' },
      { name: 'Compliance', href: '/(admin)/compliance', icon: 'shield-outline' },
      { name: 'Incidents', href: '/(admin)/incidents', icon: 'warning-outline' },
      { name: 'Disputes', href: '/(admin)/disputes', icon: 'alert-circle-outline' },
      { name: 'Audit Logs', href: '/(admin)/audit', icon: 'list-outline' },
    ],
  },
  {
    title: 'Config',
    items: [
      { name: 'Organizations', href: '/(admin)/organizations', icon: 'business-outline' },
      { name: 'Services', href: '/(admin)/services', icon: 'construct-outline' },
      { name: 'Settings', href: '/(admin)/settings', icon: 'settings-outline' },
    ],
  },
];

export const ADMIN_ACCOUNT_LINKS: AdminNavItem[] = [
  { name: 'Profile', href: '/(admin)/profile', icon: 'person-outline' },
  { name: 'Notifications', href: '/(admin)/notifications', icon: 'notifications-outline' },
];
