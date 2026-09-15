import { getInitials, getLogoColor } from '@/lib/format';

export function Logo({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
  };
  return (
    <div className={`${sizes[size]} ${getLogoColor(name)} rounded-lg flex items-center justify-center text-white font-bold shrink-0`}>
      {getInitials(name)}
    </div>
  );
}
