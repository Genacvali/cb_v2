interface CategoryIconProps {
  icon: string;
  className?: string;
  color?: string;
}

export function CategoryIcon({ icon, className = 'w-5 h-5' }: CategoryIconProps) {
  // Check if it's an emoji (starts with emoji or is a single character/emoji)
  const isEmoji = /\p{Emoji}/u.test(icon) || icon.length <= 2;
  
  if (isEmoji) {
    return <span className={className} style={{ fontSize: '1.25em', lineHeight: 1 }}>{icon}</span>;
  }
  
  // Fallback for old icon names - show a default emoji
  return <span className={className} style={{ fontSize: '1.25em', lineHeight: 1 }}>💰</span>;
}

export const availableIcons = [
  '💰', '💳', '🏠', '🚗', '🛒', '🎮', '✈️', '🎁', '📱', '💼',
  '🍔', '☕', '🏥', '📚', '👶', '🐕', '💅', '🎬', '🏋️', '🎵',
  '🍕', '🚌', '💊', '🎓', '👗', '🏖️', '🎨', '🔧', '📦', '🌿',
  '🍷', '🎭', '⚽', '🛠️', '💻', '📸', '🎧', '🏡', '🚕', '💡'
];
