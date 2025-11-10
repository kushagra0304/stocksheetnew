'use client';

import { useState } from 'react';
import Link from 'next/link';
import ItemForm from './components/ItemForm';
import ItemsList from './components/ItemsList';

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleItemAdded = () => {
    // Trigger refresh of items list
    setRefreshKey((prev) => prev + 1);
    // Dispatch custom event to refresh items
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('refreshItems'));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Item Management</h1>
            <p className="text-gray-600">Add new items and view the last 10 items</p>
          </div>
          <Link
            href="/items"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            View All Items
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Add New Item</h2>
          <ItemForm onItemAdded={handleItemAdded} />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Last 10 Items</h2>
          <ItemsList key={refreshKey} />
        </div>
      </div>
    </div>
  );
}
