'use client';

import { usePathname } from 'next/navigation';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { FrontDeskSidebar } from '@/components/layout/FrontDeskSidebar';
import { NursingSidebar } from '@/components/layout/NursingSidebar';
import { TheaterSidebar } from '@/components/layout/TheaterSidebar';
import { CleaningSidebar } from '@/components/layout/CleaningSidebar';
import { getSidebarForPath } from '@/lib/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const sidebarType = getSidebarForPath(pathname, user);

  const renderSidebar = () => {
    switch (sidebarType) {
      case 'admin':
        return <AdminSidebar />;
      case 'frontdesk':
        return <FrontDeskSidebar />;
      case 'nursing':
        return <NursingSidebar />;
      case 'theater':
        return <TheaterSidebar />;
      case 'cleaning':
        return <CleaningSidebar />;
      default:
        return <Sidebar />;
    }
  };

  return (
    <AuthGuard>
      <div className="flex h-screen bg-isabelline overflow-hidden">
        {/* Sidebar - Positioned on the left */}
        <aside className="flex-shrink-0 h-full">
          {renderSidebar()}
        </aside>

        {/* Vertical Stack: Header then Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />

          <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
            <div className="max-w-[1600px] mx-auto min-h-full pb-12">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}




