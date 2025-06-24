import React from 'react';
import { NavLink } from 'react-router-dom';
import { HomeIcon, ListBulletIcon, BanknotesIcon, ChartPieIcon, Cog8ToothIcon, TagIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { APP_NAME } from '../constants';

interface NavItem {
  path: string;
  name: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { path: '/', name: 'Panel', icon: HomeIcon },
  { path: '/transactions', name: 'Transacciones', icon: ListBulletIcon },
  { path: '/accounts', name: 'Cuentas', icon: BanknotesIcon },
  { path: '/categories', name: 'Categorías', icon: TagIcon },
  { path: '/statistics', name: 'Estadísticas', icon: ChartPieIcon },
  { path: '/utilities', name: 'Utilidades', icon: Cog8ToothIcon },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void; 
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Backdrop for mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 dark:bg-opacity-70 transition-opacity md:hidden"
          onClick={onClose}
          aria-hidden="true"
        ></div>
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-sidebar-bg text-text-principal p-4 shadow-lg
          transform transition-transform duration-300 ease-in-out
          md:sticky md:top-0 md:h-screen md:shadow-lg md:translate-x-0 
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        aria-label="Sidebar"
      >
        <div className="flex justify-between items-center md:hidden mb-4">
            <span className="text-xl font-semibold text-primary">{APP_NAME}</span>
            <button 
              onClick={onClose} 
              className="p-1 text-text-secondary hover:text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Cerrar barra lateral"
            >
                <XMarkIcon className="h-6 w-6" />
            </button>
        </div>
        <nav>
          <ul>
            {navItems.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.path}
                  onClick={() => { if (window.innerWidth < 768 && isOpen) onClose(); }} 
                  className={({ isActive }) =>
                    `flex items-center space-x-3 p-2 rounded-md text-text-secondary hover:bg-border-color hover:text-primary ${
                      isActive ? 'bg-primary/10 text-primary font-semibold' : ''
                    }`
                  }
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;