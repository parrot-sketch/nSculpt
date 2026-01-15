'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardRoute } from '@/lib/navigation';

export default function NotFound() {
  const { user } = useAuth();
  const dashboardRoute = getDashboardRoute(user);

  return (
    <div className="min-h-screen flex items-center justify-center bg-isabelline px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-spaceCadet mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-spaceCadet mb-4">
          Page Not Found
        </h2>
        <p className="text-neutral-600 mb-6">
          The page you are looking for does not exist.
        </p>
        <Link
          href={dashboardRoute}
          className="inline-block px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}




