import React from 'react';

interface CardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

export const Card: React.FC<CardProps> = ({ title, value, icon, color }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex items-center">
      <div className={`p-3 rounded-full mr-4 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{value}</p>
      </div>
    </div>
  );
};
