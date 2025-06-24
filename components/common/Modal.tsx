import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-4 transition-opacity duration-300"
      onClick={onClose} // Close on backdrop click
    >
      <div 
        className={`bg-modal-bg text-text-principal rounded-lg shadow-xl w-full ${sizeClasses[size]} overflow-hidden transform transition-all duration-300 ease-out`}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal content
      >
        <div className="flex justify-between items-center p-4 border-b border-border-color">
          <h3 className="text-lg font-semibold text-text-principal">{title}</h3>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-principal focus:outline-none"
            aria-label="Cerrar modal"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 md:p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;