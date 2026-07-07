/**
 * Admin Constants
 * 
 * Centralized configuration for admin panel:
 * - Navigation structure (source of truth for sidebar)
 * - Role definitions
 * - Route definitions
 */

import {
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  ShieldCheck,
  FileText,
  AlertTriangle,
  ClipboardList,
  Settings,
  BarChart3,
  Building2,
  UserCheck,
  Shield,
  Heart,
  BookOpen,
  DollarSign,
  LucideIcon,
} from 'lucide-react';

export type AdminRole = 'admin' | 'moderator' | 'support';

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  children?: NavItem[];
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}


export const ADMIN_NAVIGATION: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'User Management',
    items: [
      { name: 'Users', href: '/admin/users', icon: Users },
      { name: 'Providers', href: '/admin/providers', icon: UserCheck },
      { name: 'Staff', href: '/admin/staff', icon: Shield },
    ],
  },
  {
    title: 'Operations',
    items: [
      { name: 'Bookings', href: '/admin/bookings', icon: Calendar },
      { name: 'Sessions', href: '/admin/sessions', icon: BookOpen },
      { name: 'Assignments', href: '/admin/assignments', icon: ClipboardList },
    ],
  },
  {
    title: 'Finance',
    items: [
      { name: 'Payments', href: '/admin/payments', icon: CreditCard },
      { name: 'Payouts', href: '/admin/payouts', icon: DollarSign },
    ],
  },
  {
    title: 'Trust & Safety',
    items: [
      { name: 'Compliance', href: '/admin/compliance', icon: ShieldCheck },
      { name: 'Documents', href: '/admin/documents', icon: FileText },
      { name: 'Verifications', href: '/admin/verifications', icon: ShieldCheck },
      { name: 'Incidents', href: '/admin/incidents', icon: AlertTriangle },
      { name: 'Audit Logs', href: '/admin/audit-logs', icon: ClipboardList },
    ],
  },
  {
    title: 'Platform',
    items: [
      { name: 'Services', href: '/admin/services', icon: Building2 },
      { name: 'Settings', href: '/admin/settings', icon: Settings },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    ],
  },
];


