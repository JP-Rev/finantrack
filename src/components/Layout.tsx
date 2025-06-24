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
    //   if (window.innerWidth >= 768) {
    //     setIsSidebarOpen(true); // Default to open on larger screens
    //   } else {
    //     // Optionally close on smaller screens if it was open, or maintain state
    //   }
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
      <div className="flex flex-1 relative"> {/* Added relative for sticky positioning context if needed by children */}
        {/* Sidebar is now a direct child and uses its own classes for positioning and visibility */}
        <Sidebar isOpen={isSidebarOpen} onClose={handleCloseSidebar} />
        
        <main
          className={`
            flex-1 p-4 md:p-6 overflow-y-auto
            transition-all duration-300 ease-in-out
            ${isSidebarOpen ? 'md:ml-64' : 'md:ml-0'} 
            {/* ml-64 corresponds to sidebar width (w-64). Applies only on md+ screens */}
          `}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;