'use client';

import { useEffect, useState } from 'react';

interface Item {
  id: number;
  gsm: number;
  bill_number: string;
  size: string;
  rate: number;
  bf?: number | null;
  shade?: string | null;
  bought_from_mill?: string | null;
  sold_to?: string | null;
  purchase_bill_number?: string | null;
  created_at: string;
}

export default function ItemsList() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/items');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch items');
      }

      setItems(data.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Listen for custom event to refresh
  useEffect(() => {
    const handleRefresh = () => {
      fetchItems();
    };
    window.addEventListener('refreshItems', handleRefresh);
    return () => window.removeEventListener('refreshItems', handleRefresh);
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Loading items...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No items found. Add your first item above!</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              GSM
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Bill Number
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Purchase Bill
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Size
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Rate
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              BF
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Shade
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Bought From
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Sold To
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created At
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                {item.gsm}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                {item.bill_number}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                {item.purchase_bill_number || '-'}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                {item.size}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                ₹{parseFloat(item.rate.toString()).toFixed(2)}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                {item.bf ? parseFloat(item.bf.toString()).toFixed(2) : '-'}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                {item.shade || '-'}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                {item.bought_from_mill || '-'}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                {item.sold_to || '-'}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(item.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

