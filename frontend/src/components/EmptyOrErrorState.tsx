import React from 'react';

interface EmptyOrErrorStateProps {
  error?: string;
  emptyMessage?: string;
}

const EmptyOrErrorState: React.FC<EmptyOrErrorStateProps> = ({ error, emptyMessage }) => {
  if (error) {
    return <div className="error-state">{error}</div>;
  }
  return <div className="empty-state">{emptyMessage || 'No data available.'}</div>;
};

export default EmptyOrErrorState;

