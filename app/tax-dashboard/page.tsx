import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { TaxCalculationDashboard } from '@/components/TaxCalculationDashboard';

export default async function TaxDashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TaxCalculationDashboard />
    </div>
  );
}
