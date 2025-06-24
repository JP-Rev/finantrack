import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  Icon?: React.ElementType;
}

const Input: React.FC<InputProps> = ({ label, id, error, Icon, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-1">{label}</label>}
      <div className="relative rounded-md shadow-sm">
        {Icon && <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Icon className="h-5 w-5 text-text-secondary" aria-hidden="true" /></div>}
        <input
          id={id}
          className={`
            form-input block w-full sm:text-sm rounded-md
            bg-input-bg text-text-principal placeholder-text-secondary/70
            border-input-border focus:ring-primary focus:border-primary
            disabled:bg-border-color disabled:text-text-secondary/70 disabled:cursor-not-allowed
            ${Icon ? 'pl-10' : 'pl-3'}
            pr-3 py-2
            ${error ? 'border-danger focus:ring-danger focus:border-danger' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
};

export default Input;