'use client';

import { useState, FormEvent, useEffect } from 'react';
import AutocompleteInput from './AutocompleteInput';

interface Item {
  id: number;
  gsm: number;
  sale_bill_number: string;
  size: string;
  rate: number;
  bf?: number | null;
  weight?: number | null;
  shade?: string | null;
  bought_from_mill?: string | null;
  sold_to?: string | null;
  purchase_bill_number?: string | null;
  sale_bill_date?: string | null;
  purchase_bill_date?: string | null;
  created_at: string;
}

interface ItemFormProps {
  onItemAdded: () => void;
}

export default function ItemForm({ onItemAdded }: ItemFormProps) {
  const [formData, setFormData] = useState({
    gsm: '',
    sale_bill_number: '',
    size: '',
    rate: '',
    bf: '',
    weight: '',
    shade: '',
    bought_from_mill: '',
    sold_to: '',
    purchase_bill_number: '',
    sale_bill_date: '',
    purchase_bill_date: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load last item on mount to populate default values
  useEffect(() => {
    const loadLastItem = async () => {
      try {
        const response = await fetch('/api/items');
        const data = await response.json();
        if (data.success && data.data && data.data.length > 0) {
          const lastItem: Item = data.data[0]; // First item is the most recent
          
          // Format dates for HTML date input (YYYY-MM-DD)
          const formatDateForInput = (dateString: string | null | undefined): string => {
            if (!dateString) return '';
            try {
              const date = new Date(dateString);
              if (isNaN(date.getTime())) return '';
              return date.toISOString().split('T')[0];
            } catch {
              return '';
            }
          };
          
          setFormData({
            gsm: lastItem.gsm?.toString() || '',
            sale_bill_number: lastItem.sale_bill_number || '',
            size: lastItem.size || '',
            rate: lastItem.rate?.toString() || '',
            bf: lastItem.bf?.toString() || '',
            weight: lastItem.weight?.toString() || '',
            shade: lastItem.shade || '',
            bought_from_mill: lastItem.bought_from_mill || '',
            sold_to: lastItem.sold_to || '',
            purchase_bill_number: lastItem.purchase_bill_number || '',
            sale_bill_date: formatDateForInput(lastItem.sale_bill_date),
            purchase_bill_date: formatDateForInput(lastItem.purchase_bill_date),
          });
        }
      } catch (error) {
        // Silently fail - it's okay if we can't load defaults
        console.error('Error loading last item:', error);
      }
    };

    loadLastItem();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gsm: parseInt(formData.gsm),
          sale_bill_number: formData.sale_bill_number,
          size: formData.size,
          rate: parseFloat(formData.rate),
          bf: parseFloat(formData.bf),
          weight: parseFloat(formData.weight),
          shade: formData.shade,
          bought_from_mill: formData.bought_from_mill || null,
          sold_to: formData.sold_to,
          purchase_bill_number: formData.purchase_bill_number || null,
          sale_bill_date: formData.sale_bill_date || null,
          purchase_bill_date: formData.purchase_bill_date || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add item');
      }

      setSuccess(true);
      
      // Populate form with the last inserted item's values
      const insertedItem = data.data;
      if (insertedItem) {
        // Format dates for HTML date input (YYYY-MM-DD)
        const formatDateForInput = (dateString: string | null | undefined): string => {
          if (!dateString) return '';
          try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            return date.toISOString().split('T')[0];
          } catch {
            return '';
          }
        };
        
        setFormData({
          gsm: insertedItem.gsm?.toString() || '',
          sale_bill_number: insertedItem.sale_bill_number || '',
          size: insertedItem.size || '',
          rate: insertedItem.rate?.toString() || '',
          bf: insertedItem.bf?.toString() || '',
          weight: insertedItem.weight?.toString() || '',
          shade: insertedItem.shade || '',
          bought_from_mill: insertedItem.bought_from_mill || '',
          sold_to: insertedItem.sold_to || '',
          purchase_bill_number: insertedItem.purchase_bill_number || '',
          sale_bill_date: formatDateForInput(insertedItem.sale_bill_date),
          purchase_bill_date: formatDateForInput(insertedItem.purchase_bill_date),
        });
      }
      
      // Refresh autocomplete options immediately after item is added
      // This ensures newly added values appear in the dropdowns
      setRefreshKey((prev) => prev + 1);
      
      // Also trigger a refresh after a short delay to ensure database is updated
      setTimeout(() => {
        setRefreshKey((prev) => prev + 1);
      }, 300);
      
      onItemAdded();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Product Details Section */}
      <div className="space-y-4">
        <div className="border-b border-gray-200 pb-2">
          <h3 className="text-lg font-semibold text-gray-900">Product Details</h3>
          <p className="text-sm text-gray-500">Basic product information</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="gsm" className="block text-sm font-medium text-gray-700 mb-1">
              GSM
            </label>
            <input
              type="number"
              id="gsm"
              required
              value={formData.gsm}
              onChange={(e) => setFormData({ ...formData, gsm: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
              placeholder="Enter GSM"
            />
          </div>

          <div>
            <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-1">
              Size
            </label>
            <input
              type="text"
              id="size"
              required
              value={formData.size}
              onChange={(e) => setFormData({ ...formData, size: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
              placeholder="Enter Size"
            />
          </div>

          <div>
            <label htmlFor="bf" className="block text-sm font-medium text-gray-700 mb-1">
              BF (Bursting Factor)
            </label>
            <input
              type="number"
              step="0.01"
              id="bf"
              required
              value={formData.bf}
              onChange={(e) => setFormData({ ...formData, bf: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
              placeholder="Enter BF"
            />
          </div>

          <div>
            <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
              Weight
            </label>
            <input
              type="number"
              step="0.01"
              id="weight"
              required
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
              placeholder="Enter Weight"
            />
          </div>

          <div>
            <label htmlFor="rate" className="block text-sm font-medium text-gray-700 mb-1">
              Rate
            </label>
            <input
              type="number"
              step="0.01"
              id="rate"
              required
              value={formData.rate}
              onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
              placeholder="Enter Rate"
            />
          </div>

          <div className="md:col-span-2">
            <AutocompleteInput
              label="Shade"
              id="shade"
              value={formData.shade}
              onChange={(value) => setFormData({ ...formData, shade: value })}
              optionsEndpoint="/api/items/options"
              placeholder="Select or enter shade"
              refreshKey={refreshKey}
              required={true}
            />
          </div>
        </div>
      </div>

      {/* Sale Information Section */}
      <div className="space-y-4">
        <div className="border-b border-gray-200 pb-2">
          <h3 className="text-lg font-semibold text-gray-900">Sale Information</h3>
          <p className="text-sm text-gray-500">Details about the sale transaction</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="sale_bill_number" className="block text-sm font-medium text-gray-700 mb-1">
              Sale Bill Number
            </label>
            <input
              type="text"
              id="sale_bill_number"
              required
              value={formData.sale_bill_number}
              onChange={(e) => setFormData({ ...formData, sale_bill_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
              placeholder="Enter Sale Bill Number"
            />
          </div>

          <div>
            <label htmlFor="sale_bill_date" className="block text-sm font-medium text-gray-700 mb-1">
              Sale Bill Date
            </label>
            <input
              type="date"
              id="sale_bill_date"
              value={formData.sale_bill_date}
              onChange={(e) => setFormData({ ...formData, sale_bill_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <AutocompleteInput
              label="Sold To"
              id="sold_to"
              value={formData.sold_to}
              onChange={(value) => setFormData({ ...formData, sold_to: value })}
              optionsEndpoint="/api/items/options"
              placeholder="Select or enter customer name"
              refreshKey={refreshKey}
              required={true}
            />
          </div>
        </div>
      </div>

      {/* Purchase Information Section */}
      <div className="space-y-4">
        <div className="border-b border-gray-200 pb-2">
          <h3 className="text-lg font-semibold text-gray-900">Purchase Information</h3>
          <p className="text-sm text-gray-500">Details about the purchase transaction (optional)</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="purchase_bill_number" className="block text-sm font-medium text-gray-700 mb-1">
              Purchase Bill Number
            </label>
            <input
              type="text"
              id="purchase_bill_number"
              value={formData.purchase_bill_number}
              onChange={(e) => setFormData({ ...formData, purchase_bill_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
              placeholder="Enter Purchase Bill Number"
            />
          </div>

          <div>
            <label htmlFor="purchase_bill_date" className="block text-sm font-medium text-gray-700 mb-1">
              Purchase Bill Date
            </label>
            <input
              type="date"
              id="purchase_bill_date"
              value={formData.purchase_bill_date}
              onChange={(e) => setFormData({ ...formData, purchase_bill_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <AutocompleteInput
              label="Bought From Mill"
              id="bought_from_mill"
              value={formData.bought_from_mill}
              onChange={(value) => setFormData({ ...formData, bought_from_mill: value })}
              optionsEndpoint="/api/items/options"
              placeholder="Select or enter mill name"
              refreshKey={refreshKey}
              required={false}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          Item added successfully!
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Adding...' : 'Add Item'}
      </button>
    </form>
  );
}

