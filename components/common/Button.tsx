import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  ...props
}) => {
  const baseStyles = 'font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed';
  // Note: focus:ring-offset-2 color might need adjustment based on body background in dark mode.
  // For now, it will use the default browser offset color or might need a specific dark mode variant if it looks off.
  // The ring color itself (focus:ring-primary, etc.) will use the themed color.

  // The variant styles now primarily use the theme-aware colors defined in tailwind.config.js
  const variantStyles = {
    primary: 'bg-primary text-text-on-primary hover:bg-primary-hover focus:ring-primary',
    secondary: 'bg-input-bg text-text-principal border border-input-border hover:bg-border-color focus:ring-gray-400 dark:focus:ring-gray-500', // Using input-bg for a common secondary button look
    success: 'bg-success text-white hover:bg-success/90 focus:ring-success', // Assuming success/danger always have white text for now
    danger: 'bg-danger text-white hover:bg-danger/90 focus:ring-danger',
    ghost: 'bg-transparent text-primary hover:bg-primary/10 focus:ring-primary',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <svg 
          className={`animate-spin -ml-1 mr-3 h-5 w-5 inline ${variant === 'primary' || variant === 'success' || variant === 'danger' ? 'text-white' : 'text-primary'}`} 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : children}
    </button>
  );
};

export default Button;