import { CheckCircleIcon } from "@heroicons/react/24/outline";

// src/app/components/active-account/StepsIndicator.tsx
export type StepStatus = 'current' | 'complete' | 'upcoming';

export interface Step {
  id: string;
  title: string;
  status: StepStatus;
}

export interface StepsIndicatorProps {
  steps: Step[];
}

export default function StepsIndicator({ steps }: StepsIndicatorProps) {
  return (
    <nav aria-label="Progress" className="px-8 mt-6">
      <ol role="list" className="flex items-center justify-between">
        {steps.map((step, stepIdx) => (
          <li key={step.id} className={`${stepIdx !== steps.length - 1 ? 'flex-1' : ''} flex items-center`}>
            {step.status === 'complete' ? (
              <div className="group flex w-6 h-6 items-center">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-uniss-blue group-hover:bg-blue-900">
                  <CheckCircleIcon className="h-5 w-5 text-white" aria-hidden="true" />
                </span>
              </div>
            ) : step.status === 'current' ? (
              <div className="flex items-center">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-blue-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-uniss-blue" />
                </span>
              </div>
            ) : (
              <div className="group flex items-center">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-300 group-hover:border-gray-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-transparent group-hover:bg-gray-300" />
                </span>
              </div>
            )}
            {stepIdx !== steps.length - 1 && (
              <div className={`flex-1 border-t-2 transition-colors ${step.status === 'complete' || step.status === 'current' ? 'border-blue-600' : 'border-gray-300'} mx-2`} />
            )}
          </li>
        ))}
      </ol>
      <div className="mt-2 flex justify-between text-xs font-medium text-gray-500">
        {steps.map(step => (
          <span key={step.id}>{step.title}</span>
        ))}
      </div>
    </nav>
  );
}