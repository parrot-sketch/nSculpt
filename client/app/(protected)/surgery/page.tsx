'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Surgery Dashboard
 * 
 * Redirects to /doctor dashboard (existing surgery workflow)
 * This route exists for department-aware routing but uses
 * the existing doctor dashboard for actual functionality.
 */
export default function SurgeryPage() {
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Redirect to doctor dashboard (existing surgery workflow)
        router.replace('/doctor');
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-neutral-500">Redirecting to doctor dashboard...</div>
        </div>
    );
}
