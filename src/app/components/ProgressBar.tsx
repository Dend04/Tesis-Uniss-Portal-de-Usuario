// app/components/ProgressBar.tsx
'use client';

const ProgressBar = ({ percentage, darkMode }: { percentage: number; darkMode: boolean }) => {
  return (
    <div className={`h-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
      <div
        className={`h-2 rounded-full transition-all duration-500 ${
          percentage > 50 ? 'bg-green-500' :
          percentage > 25 ? 'bg-yellow-500' : 'bg-red-500'
        }`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

export default ProgressBar;