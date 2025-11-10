'use client';

import { useState, FormEvent } from 'react';
import AutocompleteInput from './AutocompleteInput';

interface Item {
  id: number;
  gsm: number;
  bill_number: string;
  size: string;
  rate: number;
  created_at: string;
}

interface ItemFormProps {
  onItemAdded: () => void;
}

export default function ItemForm({ onItemAdded }: ItemFormProps) {
  const [formData, setFormData] = useState({
    gsm: '',
    bill_number: '',
    size: '',
    rate: '',
    bf: '',
    shade: '',
    bought_from_mill: '',
    sold_to: '',
    purchase_bill_number: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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
          bill_number: formData.bill_number,
          size: formData.size,
          rate: parseFloat(formData.rate),
          bf: formData.bf ? parseFloat(formData.bf) : null,
          shade: formData.shade || null,
          bought_from_mill: formData.bought_from_mill || null,
          sold_to: formData.sold_to || null,
          purchase_bill_number: formData.purchase_bill_number || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add item');
      }

      setSuccess(true);
      setFormData({ 
        gsm: '', 
        bill_number: '', 
        size: '', 
        rate: '',
        bf: '',
        shade: '',
        bought_from_mill: '',
        sold_to: '',
        purchase_bill_number: '',
      });
      // Refresh autocomplete options
      setRefreshKey((prev) => prev + 1);
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <label htmlFor="bill_number" className="block text-sm font-medium text-gray-700 mb-1">
            Bill Number
          </label>
          <input
            type="text"
            id="bill_number"
            required
            value={formData.bill_number}
            onChange={(e) => setFormData({ ...formData, bill_number: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
            placeholder="Enter Bill Number"
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

        <div>
          <label htmlFor="bf" className="block text-sm font-medium text-gray-700 mb-1">
            BF (Bursting Factor)
          </label>
          <input
            type="number"
            step="0.01"
            id="bf"
            value={formData.bf}
            onChange={(e) => setFormData({ ...formData, bf: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
            placeholder="Enter BF"
          />
        </div>

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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AutocompleteInput
          label="Shade"
          id="shade"
          value={formData.shade}
          onChange={(value) => setFormData({ ...formData, shade: value })}
          optionsEndpoint="/api/items/options"
          placeholder="Select or enter shade"
          refreshKey={refreshKey}
        />

        <AutocompleteInput
          label="Bought From Mill"
          id="bought_from_mill"
          value={formData.bought_from_mill}
          onChange={(value) => setFormData({ ...formData, bought_from_mill: value })}
          optionsEndpoint="/api/items/options"
          placeholder="Select or enter mill name"
          refreshKey={refreshKey}
        />

        <AutocompleteInput
          label="Sold To"
          id="sold_to"
          value={formData.sold_to}
          onChange={(value) => setFormData({ ...formData, sold_to: value })}
          optionsEndpoint="/api/items/options"
          placeholder="Select or enter customer name"
          refreshKey={refreshKey}
        />
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

