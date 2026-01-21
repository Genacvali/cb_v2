import { useState, useRef, ReactNode } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeableCategoryProps {
  children: ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}

const SWIPE_THRESHOLD = 80;

export function SwipeableCategory({ 
  children, 
  onEdit, 
  onDelete,
  className 
}: SwipeableCategoryProps) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    currentXRef.current = e.touches[0].clientX;
    const diff = currentXRef.current - startXRef.current;
    
    // Limit the swipe distance
    const newOffset = Math.max(-SWIPE_THRESHOLD - 20, Math.min(SWIPE_THRESHOLD + 20, diff));
    setOffset(newOffset);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    // Snap to action position or back to center
    if (offset > SWIPE_THRESHOLD / 2) {
      setOffset(SWIPE_THRESHOLD);
    } else if (offset < -SWIPE_THRESHOLD / 2) {
      setOffset(-SWIPE_THRESHOLD);
    } else {
      setOffset(0);
    }
  };

  const handleActionClick = (action: 'edit' | 'delete') => {
    setOffset(0);
    if (action === 'edit') {
      onEdit();
    } else {
      onDelete();
    }
  };

  const resetPosition = () => {
    setOffset(0);
  };

  return (
    <div className={cn("relative overflow-hidden rounded-lg", className)}>
      {/* Edit action (right side - revealed on swipe right) */}
      <div 
        className="absolute inset-y-0 left-0 flex items-center justify-center bg-primary text-primary-foreground transition-opacity"
        style={{ 
          width: SWIPE_THRESHOLD,
          opacity: offset > 0 ? Math.min(offset / SWIPE_THRESHOLD, 1) : 0,
        }}
        onClick={() => handleActionClick('edit')}
      >
        <div className="flex flex-col items-center gap-1">
          <Pencil className="w-5 h-5" />
          <span className="text-xs font-medium">Изменить</span>
        </div>
      </div>

      {/* Delete action (left side - revealed on swipe left) */}
      <div 
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-destructive text-destructive-foreground transition-opacity"
        style={{ 
          width: SWIPE_THRESHOLD,
          opacity: offset < 0 ? Math.min(-offset / SWIPE_THRESHOLD, 1) : 0,
        }}
        onClick={() => handleActionClick('delete')}
      >
        <div className="flex flex-col items-center gap-1">
          <Trash2 className="w-5 h-5" />
          <span className="text-xs font-medium">Удалить</span>
        </div>
      </div>

      {/* Main content */}
      <div
        className={cn(
          "relative bg-card transition-transform",
          !isDragging && "transition-transform duration-200"
        )}
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => offset !== 0 && resetPosition()}
      >
        {children}
      </div>
    </div>
  );
}
