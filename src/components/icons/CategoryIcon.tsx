import {
  Wallet,
  Briefcase,
  Banknote,
  Laptop,
  ShoppingCart,
  Car,
  Home,
  Gamepad2,
  PiggyBank,
  MoreHorizontal,
  Folder,
  MessageCircle,
  TrendingUp,
  FileText,
  Wrench,
  BookOpen,
  Baby,
  HeartPulse,
  Plane,
  Gift,
  LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  wallet: Wallet,
  briefcase: Briefcase,
  banknote: Banknote,
  laptop: Laptop,
  'shopping-cart': ShoppingCart,
  car: Car,
  home: Home,
  'gamepad-2': Gamepad2,
  'piggy-bank': PiggyBank,
  'more-horizontal': MoreHorizontal,
  folder: Folder,
  'message-circle': MessageCircle,
  'trending-up': TrendingUp,
  'file-text': FileText,
  wrench: Wrench,
  'book-open': BookOpen,
  baby: Baby,
  'heart-pulse': HeartPulse,
  plane: Plane,
  gift: Gift,
};

interface CategoryIconProps {
  icon: string;
  className?: string;
  color?: string;
}

export function CategoryIcon({ icon, className = 'w-5 h-5', color }: CategoryIconProps) {
  const Icon = iconMap[icon] || Wallet;
  return <Icon className={className} style={color ? { color } : undefined} />;
}

export const availableIcons = Object.keys(iconMap);
