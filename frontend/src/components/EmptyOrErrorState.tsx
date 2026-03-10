import React from 'react';

interface EmptyOrErrorStateProps {
    error?: string;
    emptyMessage?: string;
}

const EmptyOrErrorState: React.FC<EmptyOrErrorStateProps> = ({ error, emptyMessage }) => {
    if (error) {
        return (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
            </div>
        );
    }

    return (
        <div className="rounded-md bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-500">
            {emptyMessage ?? 'No data available.'}
        </div>
    );
};

export default EmptyOrErrorState;
