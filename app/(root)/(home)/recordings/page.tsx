"use client";

import CallList from '@/components/CallList';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

// Force dynamic rendering since this page uses authentication
export const dynamic = 'force-dynamic';

const PreviousPage = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <section className="flex size-full flex-col gap-10 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Recordings</h1>
        <Button 
          onClick={handleRefresh}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <CallList key={refreshKey} type="recordings" />
    </section>
  );
};

export default PreviousPage;
