// app/components/ProgressBar.tsx
"use client";

interface ProgressBarProps {
  percentage: number;
  darkMode: boolean;
  thickness?: "thin" | "medium" | "thick";
}

const ProgressBar = ({
  percentage,
  darkMode,
  thickness = "medium",
}: ProgressBarProps) => {
  const heightClass = {
    thin: "h-2",
    medium: "h-3",
    thick: "h-4",
  }[thickness];

  return (
    <div className="w-full">
      <div className="flex justify-between mb-1">
        <span
          className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}
        >
          Progreso
        </span>
        <span
          className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}
        >
          {percentage}%
        </span>
      </div>
      <div
        className={`rounded-full ${
          darkMode ? "bg-gray-700" : "bg-gray-200"
        } ${heightClass}`}
      >
        <div
          className={`rounded-full transition-all duration-500 ${
            percentage >= 90
              ? "bg-green-500"
              : percentage >= 50
              ? "bg-uniss-blue"
              : percentage >= 25
              ? "bg-yellow-500"
              : "bg-red-500"
          } ${heightClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
