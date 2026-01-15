import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect to dashboard (will be handled by middleware/auth)
  redirect('/dashboard');
}












