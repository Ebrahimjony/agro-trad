import { useState } from 'react';
import { Cog } from 'lucide-react';

interface MachineImageProps {
  src?: string;
  alt: string;
  className?: string;
}

export function MachineImage({ src, alt, className = 'w-full h-full object-cover' }: MachineImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-4 text-center select-none">
        <Cog className="w-10 h-10 mb-2 text-slate-300" aria-hidden="true" />
        <span className="text-xs font-medium text-slate-500 line-clamp-2 max-w-[180px]">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
