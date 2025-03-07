// app/components/ProgressBar.tsx
'use client';

const ProgressBar = ({ percentage, darkMode }: { percentage: number; darkMode: boolean }) => {
  return (
    <div className="w-full">
      <div className="flex justify-between mb-1">
        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Progreso
        </span>
        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          {percentage}%
        </span>
      </div>
      <div className={`h-3 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
        <div
          className={`h-3 rounded-full transition-all duration-500 ${
            percentage >= 90 ? 'bg-green-500' :
            percentage >= 50 ? 'bg-blue-500' : 'bg-yellow-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;