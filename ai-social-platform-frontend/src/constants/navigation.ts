import type { ComponentType } from 'react';
import {
  IconDashboard,
  IconPen,
  IconCalendar,
  IconChart,
  IconSettings,
  IconUsers,
  IconGlobe,
  IconSparkle,
  IconBolt,
  IconPhoto,
  IconPresentation,
} from '../components/ui/Icons';

type IconProps = { className?: string };

export interface NavLinkItem {
  to: string;
  label: string;
  icon: ComponentType<IconProps>;
  end?: boolean;
}

export interface NavGroup {
  label: string;
  links: NavLinkItem[];
}

export const marketingAnchors = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
] as const;

export const adminNavLinks: NavLinkItem[] = [
  { to: '/admin/users', label: 'User management', icon: IconUsers },
];

export const appNavGroups: NavGroup[] = [
  {
    label: 'Overview',
    links: [
      { to: '/dashboard', label: 'Dashboard', icon: IconDashboard, end: true },
      { to: '/accounts', label: 'Connected accounts', icon: IconGlobe },
    ],
  },
  {
    label: 'Presentation Studio',
    links: [
      { to: '/ppt-maker', label: 'AI PPT Maker', icon: IconPresentation },
    ],
  },
  {
    label: 'Content',
    links: [
      { to: '/posts/new', label: 'New post', icon: IconPen },
      { to: '/media/library', label: 'Image Library', icon: IconPhoto },
      { to: '/posts/calendar', label: 'Calendar', icon: IconCalendar },
      { to: '/posts/scheduled', label: 'Scheduled list', icon: IconCalendar },
    ],
  },
  {
    label: 'Discover',
    links: [
      { to: '/ideas',    label: 'Claude Post Ideas',  icon: IconSparkle },
      { to: '/trending', label: 'Trending Topics',    icon: IconBolt },
    ],
  },
  {
    label: 'Insights',
    links: [{ to: '/analytics', label: 'Analytics', icon: IconChart }],
  },
  {
    label: 'Account',
    links: [{ to: '/settings', label: 'Settings', icon: IconSettings }],
  },
];

export const mobileNavLinks: NavLinkItem[] = [
  { to: '/dashboard', label: 'Home', icon: IconDashboard, end: true },
  { to: '/accounts', label: 'Accounts', icon: IconGlobe },
  { to: '/posts/new', label: 'Create', icon: IconPen },
  { to: '/analytics', label: 'Stats', icon: IconChart },
  { to: '/settings', label: 'Settings', icon: IconSettings },
];

export const footerLinks = {
  product: [
    { label: 'Features', href: '/#features' },
    { label: 'How it works', href: '/#how-it-works' },
    { label: 'Pricing', href: '/#pricing' },
  ],
  account: [
    { label: 'Sign in', to: '/login' },
    { label: 'Create account', to: '/register' },
    { label: 'Dashboard', to: '/dashboard' },
  ],
} as const;
