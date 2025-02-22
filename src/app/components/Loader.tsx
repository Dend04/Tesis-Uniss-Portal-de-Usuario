// app/components/Loader.tsx
'use client';

const Loader = ({ className }: { className: string }) => (
  <div className={`flex justify-center items-center ${className}`}>
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-uniss-blue"></div>
  </div>
);

export default Loader;