import React, { useState, useEffect, useCallback } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    typeof window !== 'undefined' && window.innerWidth >= 768
  );

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  useEffect(() => {
    // const handleResize = () => { // Optional: manage sidebar state on resize
    // };
    // window.addEventListener('resize', handleResize);
    // return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isSidebarOpen && window.innerWidth < 768) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isSidebarOpen]);

  return (
    // The main background `bg-secondary` is applied to the body tag in index.html and is theme-aware.
    <div className="flex flex-col min-h-screen"> 
      <Header onToggleSidebar={toggleSidebar} />
      <div className="flex flex-1">
        <div className={`
            md:sticky md:top-0 md:h-screen 
            transition-all duration-300 ease-in-out
            ${isSidebarOpen ? 'md:w-64 md:shrink-0' : 'md:w-0 md:shrink-0'}
        `}>
          {/* Sidebar background is handled by its own bg-sidebar-bg class */}
          <Sidebar isOpen={isSidebarOpen} onClose={handleCloseSidebar} />
        </div>
        <main
          className="flex-1 p-4 md:p-6 overflow-y-auto" // Page content background is typically white cards on top of body's bg-secondary
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;