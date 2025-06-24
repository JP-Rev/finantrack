import React from 'react';
import { APP_NAME } from '../constants';
import { Link } from 'react-router-dom';
import { Bars3Icon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';
import Button from './common/Button';

interface HeaderProps {
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="bg-primary text-text-on-primary shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-2 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <button
            onClick={onToggleSidebar}
            className="mr-3 p-2 rounded-md text-text-on-primary hover:bg-primary-hover/80 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            aria-label="Alternar barra lateral"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <Link to="/" className="text-2xl font-bold text-text-on-primary">
            {APP_NAME}
          </Link>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="text-text-on-primary hover:bg-primary-hover/20"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
          Salir
        </Button>
      </div>
    </header>
  );
};

export default Header;