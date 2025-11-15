import React from 'react';
import { ChevronDownIcon } from '../Icons';

interface AccordionSectionProps {
    title: string;
    subtitle: string;
    sectionId: string;
    expandedSection: string | null;
    setExpandedSection: (id: string | null) => void;
    children: React.ReactNode;
}

export const AccordionSection: React.FC<AccordionSectionProps> = ({ title, subtitle, sectionId, expandedSection, setExpandedSection, children }) => {
    const isExpanded = expandedSection === sectionId;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md transition-all duration-300">
            <button
                onClick={() => setExpandedSection(isExpanded ? null : sectionId)}
                className="w-full flex justify-between items-center p-6 text-left"
                aria-expanded={isExpanded}
                aria-controls={`section-content-${sectionId}`}
            >
                <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
                </div>
                <ChevronDownIcon className={`w-6 h-6 text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            <div
                id={`section-content-${sectionId}`}
                className={`transition-all duration-300 ease-in-out grid ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            >
                <div className="overflow-hidden">
                    <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};
