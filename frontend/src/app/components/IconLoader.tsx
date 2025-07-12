// src/components/IconLoader.tsx
'use client';

import dynamic from "next/dynamic";
import { ComponentType } from "react";

interface IconLoaderProps {
  name: string;
  className: string;
}

const IconLoader = ({ name, className }: IconLoaderProps) => {
  const Icon = dynamic(
    () =>
      import("@heroicons/react/24/outline").then((mod) => {
        const IconComponent = mod[name as keyof typeof mod] as ComponentType<{
          className?: string;
        }>;
        return IconComponent;
      }),
    {
      loading: () => <div className={className} />,
      ssr: false,
    }
  );

  return <Icon className={className} aria-hidden="true" />;
};

export default IconLoader;