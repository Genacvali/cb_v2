interface CategoryIconProps {
  icon: string;
  className?: string;
  color?: string;
}

export function CategoryIcon({ icon, className = '' }: CategoryIconProps) {
  // Check if it's an emoji (starts with emoji or is a single character/emoji)
  const isEmoji = /\p{Emoji}/u.test(icon) || icon.length <= 2;
  
  if (isEmoji) {
    return (
      <span 
        className={`flex items-center justify-center text-base ${className}`}
        style={{ lineHeight: 1 }}
      >
        {icon}
      </span>
    );
  }
  
  // Fallback for old icon names - show a default emoji
  return (
    <span 
      className={`flex items-center justify-center text-base ${className}`}
      style={{ lineHeight: 1 }}
    >
      💰
    </span>
  );
}

export const availableIcons = [
  '💰', '💳', '🏠', '🚗', '🛒', '🎮', '✈️', '🎁', '📱', '💼',
  '🍔', '☕', '🏥', '📚', '👶', '🐕', '🐱', '💅', '🎬', '🏋️', '🎵',
  '🍕', '🚌', '💊', '🎓', '👗', '🏖️', '🎨', '🔧', '📦', '🌿',
  '🍷', '🎭', '⚽', '🛠️', '💻', '📸', '🎧', '🏡', '🚕', '💡',
  '🌸', '🎂', '🐈',
  '🧹', '🧺', '🧼', '🧽', '🧻', '🚿', '🛁', '🔑', '🛋️', '🛏️',
  '🍽️', '🍳', '🧊', '🚰', '🔌', '🧯', '🪴', '🗑️',
];
