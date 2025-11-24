'use client';

import { useState, FormEvent, useEffect, useRef, useCallback } from 'react';

interface Reel {
  id: number;
  reel_number: string | null;
  gsm: number;
  size: string;
  size_unit: string;
  bf: number;
  weight: number;
  shade: string;
  rate: number | null;
  purchase_id?: number;
  sale_id?: number | null;
  purchase_bill_number?: string;
  purchase_bill_date?: string;
  bought_from_mill?: string;
}

interface ItemFormProps {
  onItemAdded: () => void;
}

type FormMode = 'purchase' | 'sale';

// localStorage utility functions
const STORAGE_KEYS = {
  PURCHASE_FORM: 'stocksheet_purchase_form',
  SALE_FORM: 'stocksheet_sale_form',
  FORM_MODE: 'stocksheet_form_mode',
};

const saveToLocalStorage = (key: string, data: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

const loadFromLocalStorage = <T,>(key: string): T | null => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) as T : null;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return null;
  }
};

const clearLocalStorage = (keys: string[]) => {
  try {
    keys.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
};

export default function ItemForm({ onItemAdded }: ItemFormProps) {
  const [mode, setMode] = useState<FormMode>('purchase');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [dataRestored, setDataRestored] = useState(false);
  const isInitialMount = useRef(true);
  const shouldSave = useRef(true);
  
  // Helper function to check if purchase form is empty (default state)
  const isPurchaseFormEmpty = useCallback((pData: typeof purchaseData, pReels: typeof purchaseReels) => {
    return !pData.purchase_bill_number && 
           pReels.every(reel => !reel.reel_number && !reel.gsm && !reel.size);
  }, []);
  
  // Helper function to check if sale form is empty (default state)
  const isSaleFormEmpty = useCallback((sData: typeof saleData, sReels: typeof selectedReels) => {
    return !sData.sale_bill_number && sReels.length === 0;
  }, []);
  
  // ENUM options
  const [shadeOptions, setShadeOptions] = useState<string[]>([]);
  
  // Company options (with IDs)
  interface CompanyOption {
    id: number;
    name: string;
  }
  const [millOptions, setMillOptions] = useState<CompanyOption[]>([]);
  const [customerOptions, setCustomerOptions] = useState<CompanyOption[]>([]);
  
  // Purchase form data
  const [purchaseData, setPurchaseData] = useState({
    purchase_bill_number: '',
    purchase_bill_date: '',
    company_id: '',
  });
  
  // Sale form data
  const [saleData, setSaleData] = useState({
    sale_bill_number: '',
    sale_bill_date: '',
    company_id: '',
  });
  
  // Reels for purchase mode (array of reel objects)
  const [purchaseReels, setPurchaseReels] = useState([{
    reel_number: '',
    gsm: '',
    size: '',
    size_unit: '',
    bf: '',
    weight: '',
    shade: '',
  }]);
  
  // Available reels for sale mode
  const [availableReels, setAvailableReels] = useState<Reel[]>([]);
  // Loading state for available reels
  const [isLoadingReels, setIsLoadingReels] = useState(false);
  // Selected reels for sale (with rates and reel_number)
  const [selectedReels, setSelectedReels] = useState<{ reel_id: number; rate: string; reel_number: string }[]>([]);

  // Load ENUM options and restore form data from localStorage
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load ENUM options and company options
        const [shadeRes, millsRes, customersRes] = await Promise.all([
          fetch('/api/items/options?field=shade'),
          fetch('/api/companies?type=mill'),
          fetch('/api/companies?type=customer'),
        ]);
        
        const shadeData = await shadeRes.json();
        const millsData = await millsRes.json();
        const customersData = await customersRes.json();
        
        if (shadeData.success) setShadeOptions(shadeData.data || []);
        if (millsData.success) setMillOptions(millsData.data || []);
        if (customersData.success) setCustomerOptions(customersData.data || []);
        
        // Restore form data from localStorage
        const savedMode = loadFromLocalStorage<FormMode>(STORAGE_KEYS.FORM_MODE);
        
        if (savedMode) {
          setMode(savedMode);
        }

        // Check for purchase data (either if mode is purchase or if we have purchase data)
        const savedPurchaseData = loadFromLocalStorage<{
          purchaseData: typeof purchaseData;
          purchaseReels: typeof purchaseReels;
        }>(STORAGE_KEYS.PURCHASE_FORM);
        
        // Check for sale data
        const savedSaleData = loadFromLocalStorage<{
          saleData: typeof saleData;
          selectedReels: typeof selectedReels;
        }>(STORAGE_KEYS.SALE_FORM);

        // Restore mode first
        const modeToRestore = savedMode || 'purchase';
        if (savedMode) {
          setMode(savedMode);
        }

        // Restore purchase data if it exists in localStorage (regardless of mode)
        if (savedPurchaseData) {
          shouldSave.current = false;
          setPurchaseData(savedPurchaseData.purchaseData);
          setPurchaseReels(savedPurchaseData.purchaseReels.length > 0 
            ? savedPurchaseData.purchaseReels 
            : [{ reel_number: '', gsm: '', size: '', size_unit: '', bf: '', weight: '', shade: '' }]);
          setDataRestored(true);
          setTimeout(() => setDataRestored(false), 5000);
          shouldSave.current = true;
        }

        // Restore sale data if it exists in localStorage (regardless of mode)
        if (savedSaleData) {
          shouldSave.current = false;
          setSaleData(savedSaleData.saleData);
          setSelectedReels(savedSaleData.selectedReels || []);
          setDataRestored(true);
          setTimeout(() => setDataRestored(false), 5000);
          shouldSave.current = true;
        }
        
        // Load available reels for sale mode
        if (modeToRestore === 'sale') {
          setIsLoadingReels(true);
          try {
            const reelsRes = await fetch('/api/reels?available=true');
            const reelsData = await reelsRes.json();
            if (reelsData.success) {
              setAvailableReels(reelsData.data || []);
            }
          } catch (error) {
            console.error('Error loading available reels:', error);
          } finally {
            setIsLoadingReels(false);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        isInitialMount.current = false;
      }
    };

    loadData();
  }, []);

  // Save mode to localStorage
  useEffect(() => {
    if (!isInitialMount.current && shouldSave.current) {
      saveToLocalStorage(STORAGE_KEYS.FORM_MODE, mode);
    }
  }, [mode]);

  // Save purchase form data to localStorage
  useEffect(() => {
    if (!isInitialMount.current && shouldSave.current) {
      saveToLocalStorage(STORAGE_KEYS.PURCHASE_FORM, {
        purchaseData,
        purchaseReels,
      });
    }
  }, [purchaseData, purchaseReels]);

  // Save sale form data to localStorage
  useEffect(() => {
    if (!isInitialMount.current && shouldSave.current) {
      saveToLocalStorage(STORAGE_KEYS.SALE_FORM, {
        saleData,
        selectedReels,
      });
    }
  }, [saleData, selectedReels]);

  // Restore form data when switching modes (if form appears empty)
  useEffect(() => {
    // Skip on initial mount (handled by initial load effect)
    if (isInitialMount.current) return;

    if (mode === 'purchase') {
      // Check if purchase form is empty and data exists in localStorage
      if (isPurchaseFormEmpty(purchaseData, purchaseReels)) {
        const savedPurchaseData = loadFromLocalStorage<{
          purchaseData: typeof purchaseData;
          purchaseReels: typeof purchaseReels;
        }>(STORAGE_KEYS.PURCHASE_FORM);

        if (savedPurchaseData) {
          shouldSave.current = false;
          setPurchaseData(savedPurchaseData.purchaseData);
          setPurchaseReels(savedPurchaseData.purchaseReels.length > 0 
            ? savedPurchaseData.purchaseReels 
            : [{ reel_number: '', gsm: '', size: '', size_unit: '', bf: '', weight: '', shade: '' }]);
          shouldSave.current = true;
        }
      }
    } else if (mode === 'sale') {
      // Check if sale form is empty and data exists in localStorage
      if (isSaleFormEmpty(saleData, selectedReels)) {
        const savedSaleData = loadFromLocalStorage<{
          saleData: typeof saleData;
          selectedReels: typeof selectedReels;
        }>(STORAGE_KEYS.SALE_FORM);

        if (savedSaleData) {
          shouldSave.current = false;
          setSaleData(savedSaleData.saleData);
          setSelectedReels(savedSaleData.selectedReels || []);
          shouldSave.current = true;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, isPurchaseFormEmpty, isSaleFormEmpty]);

  // Reload available reels when mode changes to sale
  useEffect(() => {
    if (mode === 'sale') {
      const loadAvailableReels = async () => {
        try {
          setIsLoadingReels(true);
          const reelsRes = await fetch('/api/reels?available=true');
          const reelsData = await reelsRes.json();
          if (reelsData.success) {
            setAvailableReels(reelsData.data || []);
            // Only clear selected reels if we're not restoring from localStorage
            // Use functional update to check current state value
            if (!shouldSave.current) {
              shouldSave.current = true;
            } else {
              // Check current selectedReels state - if empty, clear (user manually switched)
              // If it has values, preserve them (they were restored from localStorage)
              setSelectedReels(currentSelectedReels => {
                // Only clear if currently empty (user manually switched to sale mode)
                // If it has values, they were restored, so preserve them
                return currentSelectedReels.length === 0 ? [] : currentSelectedReels;
              });
            }
          }
        } catch (error) {
          console.error('Error loading available reels:', error);
        } finally {
          setIsLoadingReels(false);
        }
      };
      loadAvailableReels();
    } else {
      // Reset loading state when switching away from sale mode
      setIsLoadingReels(false);
    }
  }, [mode]);

  const handlePurchaseSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const reels = purchaseReels.map(reel => ({
        reel_number: reel.reel_number.trim() || null,
        gsm: parseInt(reel.gsm),
        size: reel.size,
        size_unit: reel.size_unit,
        bf: parseFloat(reel.bf),
        weight: parseFloat(reel.weight),
        shade: reel.shade,
      }));

      const response = await fetch('/api/purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          purchase_bill_number: purchaseData.purchase_bill_number,
          purchase_bill_date: purchaseData.purchase_bill_date,
          company_id: parseInt(purchaseData.company_id),
          reels,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create purchase');
      }

      setSuccess(true);
      
      // Clear localStorage after successful submission
      clearLocalStorage([STORAGE_KEYS.PURCHASE_FORM]);
      
      // Reset form
      setPurchaseData({
        purchase_bill_number: '',
        purchase_bill_date: '',
        company_id: '',
      });
      setPurchaseReels([{
        reel_number: '',
        gsm: '',
        size: '',
        size_unit: '',
        bf: '',
        weight: '',
        shade: '',
      }]);
      
      onItemAdded();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      if (selectedReels.length === 0) {
        throw new Error('Please select at least one reel');
      }

      // Validate that all selected reels have reel_number
      for (const reel of selectedReels) {
        if (!reel.reel_number || reel.reel_number.trim() === '') {
          throw new Error('Reel number is required for all selected reels. Please enter a reel number for each reel.');
        }
      }

      const reels = selectedReels.map(reel => ({
        reel_id: reel.reel_id,
        rate: parseFloat(reel.rate),
        reel_number: reel.reel_number.trim(),
      }));

      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sale_bill_number: saleData.sale_bill_number,
          sale_bill_date: saleData.sale_bill_date,
          company_id: parseInt(saleData.company_id),
          reels,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create sale');
      }

      setSuccess(true);
      
      // Clear localStorage after successful submission
      clearLocalStorage([STORAGE_KEYS.SALE_FORM]);
      
      // Reset form
      setSaleData({
        sale_bill_number: '',
        sale_bill_date: '',
        company_id: '',
      });
      setSelectedReels([]);
      
      // Reload available reels
      setIsLoadingReels(true);
      try {
        const reelsRes = await fetch('/api/reels?available=true');
        const reelsData = await reelsRes.json();
        if (reelsData.success) {
          setAvailableReels(reelsData.data || []);
        }
      } catch (error) {
        console.error('Error reloading available reels:', error);
      } finally {
        setIsLoadingReels(false);
      }
      
      onItemAdded();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addPurchaseReel = () => {
    const lastReel = purchaseReels[0];
    const newReel = lastReel ? { ...lastReel } : {
      reel_number: '',
      gsm: '',
      size: '',
      size_unit: '',
      bf: '',
      weight: '',
      shade: '',
    };
    setPurchaseReels([newReel, ...purchaseReels]);
  };

  const removePurchaseReel = (index: number) => {
    setPurchaseReels(purchaseReels.filter((_, i) => i !== index));
  };

  const updatePurchaseReel = (index: number, field: string, value: string) => {
    const updated = [...purchaseReels];
    updated[index] = { ...updated[index], [field]: value };
    setPurchaseReels(updated);
  };

  const toggleReelSelection = (reelId: number) => {
    const index = selectedReels.findIndex(r => r.reel_id === reelId);
    if (index >= 0) {
      setSelectedReels(selectedReels.filter(r => r.reel_id !== reelId));
    } else {
      const reel = availableReels.find(r => r.id === reelId);
      setSelectedReels([...selectedReels, { 
        reel_id: reelId, 
        rate: '',
        reel_number: (reel?.reel_number && reel.reel_number.trim() !== '') ? reel.reel_number : ''
      }]);
    }
  };

  const updateSelectedReelRate = (reelId: number, rate: string) => {
    setSelectedReels(selectedReels.map(r => 
      r.reel_id === reelId ? { ...r, rate } : r
    ));
  };

  const updateSelectedReelNumber = (reelId: number, reel_number: string) => {
    setSelectedReels(selectedReels.map(r => 
      r.reel_id === reelId ? { ...r, reel_number } : r
    ));
  };

  // Group reels by purchase date and purchase bill number
  const groupReelsByDateAndBill = (reels: Reel[]) => {
    const grouped: { [date: string]: { [billNumber: string]: Reel[] } } = {};
    
    for (const reel of reels) {
      const date = reel.purchase_bill_date || '';
      const billNumber = reel.purchase_bill_number || '';
      
      if (!grouped[date]) {
        grouped[date] = {};
      }
      
      if (!grouped[date][billNumber]) {
        grouped[date][billNumber] = [];
      }
      
      grouped[date][billNumber].push(reel);
    }
    
    return grouped;
  };

  // Format date for display
  const formatDateForDisplay = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Unknown Date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const clearSavedData = () => {
    if (mode === 'purchase') {
      clearLocalStorage([STORAGE_KEYS.PURCHASE_FORM]);
      setPurchaseData({
        purchase_bill_number: '',
        purchase_bill_date: '',
        company_id: '',
      });
      setPurchaseReels([{
        reel_number: '',
        gsm: '',
        size: '',
        size_unit: '',
        bf: '',
        weight: '',
        shade: '',
      }]);
    } else {
      clearLocalStorage([STORAGE_KEYS.SALE_FORM]);
      setSaleData({
        sale_bill_number: '',
        sale_bill_date: '',
        company_id: '',
      });
      setSelectedReels([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex gap-4 items-center justify-between border-b border-gray-200 pb-4">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setMode('purchase')}
            className={`px-4 py-2 rounded-md font-medium ${
              mode === 'purchase'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Purchase Mode
          </button>
          <button
            type="button"
            onClick={() => setMode('sale')}
            className={`px-4 py-2 rounded-md font-medium ${
              mode === 'sale'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Sale Mode
          </button>
        </div>
        {(purchaseData.purchase_bill_number || purchaseReels.some(r => r.reel_number) || 
          saleData.sale_bill_number || selectedReels.length > 0) && (
          <button
            type="button"
            onClick={clearSavedData}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 underline"
            title="Clear saved form data"
          >
            Clear Saved Data
          </button>
        )}
      </div>

      {dataRestored && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md">
          Your previous form data has been restored. You can continue where you left off.
        </div>
      )}

      {mode === 'purchase' ? (
        <form onSubmit={handlePurchaseSubmit} className="space-y-6">
          {/* Purchase Information */}
          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-2">
              <h3 className="text-lg font-semibold text-gray-900">Purchase Information</h3>
              <p className="text-sm text-gray-500">Details about the purchase transaction</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="purchase_bill_number" className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Bill Number *
                </label>
                <input
                  type="text"
                  id="purchase_bill_number"
                  required
                  disabled={isSubmitting}
                  value={purchaseData.purchase_bill_number}
                  onChange={(e) => setPurchaseData({ ...purchaseData, purchase_bill_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                />
              </div>
              <div>
                <label htmlFor="purchase_bill_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Bill Date *
                </label>
                <input
                  type="date"
                  id="purchase_bill_date"
                  required
                  disabled={isSubmitting}
                  value={purchaseData.purchase_bill_date}
                  onChange={(e) => setPurchaseData({ ...purchaseData, purchase_bill_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                />
              </div>
              <div>
                <label htmlFor="bought_from_mill" className="block text-sm font-medium text-gray-700 mb-1">
                  Bought From Mill *
                </label>
                <select
                  id="bought_from_mill"
                  required
                  disabled={isSubmitting}
                  value={purchaseData.company_id}
                  onChange={(e) => setPurchaseData({ ...purchaseData, company_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                >
                  <option value="">Select Mill</option>
                  {millOptions.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Reels Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Reels</h3>
                <p className="text-sm text-gray-500">Add reels for this purchase</p>
              </div>
              <button
                type="button"
                onClick={addPurchaseReel}
                disabled={isSubmitting}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Add Reel
              </button>
            </div>
            {purchaseReels.map((reel, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-900">Reel {purchaseReels.length - index}</h4>
                  {purchaseReels.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePurchaseReel(index)}
                      disabled={isSubmitting}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reel Number</label>
                    <input
                      type="text"
                      disabled={isSubmitting}
                      value={reel.reel_number}
                      onChange={(e) => updatePurchaseReel(index, 'reel_number', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">GSM *</label>
                    <input
                      type="number"
                      required
                      disabled={isSubmitting}
                      value={reel.gsm}
                      onChange={(e) => updatePurchaseReel(index, 'gsm', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Size *</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        disabled={isSubmitting}
                        value={reel.size}
                        onChange={(e) => updatePurchaseReel(index, 'size', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                      />
                      <select
                        required
                        disabled={isSubmitting}
                        value={reel.size_unit}
                        onChange={(e) => updatePurchaseReel(index, 'size_unit', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                      >
                        <option value="">Unit</option>
                        <option value="mm">mm</option>
                        <option value="cm">cm</option>
                        <option value="inch">inch</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">BF *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      disabled={isSubmitting}
                      value={reel.bf}
                      onChange={(e) => updatePurchaseReel(index, 'bf', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      disabled={isSubmitting}
                      value={reel.weight}
                      onChange={(e) => updatePurchaseReel(index, 'weight', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shade *</label>
                    <select
                      required
                      disabled={isSubmitting}
                      value={reel.shade}
                      onChange={(e) => updatePurchaseReel(index, 'shade', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                    >
                      <option value="">Select Shade</option>
                      {shadeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
              Purchase created successfully!
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Purchase'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSaleSubmit} className="space-y-6">
          {/* Sale Information */}
          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-2">
              <h3 className="text-lg font-semibold text-gray-900">Sale Information</h3>
              <p className="text-sm text-gray-500">Details about the sale transaction</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="sale_bill_number" className="block text-sm font-medium text-gray-700 mb-1">
                  Sale Bill Number *
                </label>
                <input
                  type="text"
                  id="sale_bill_number"
                  required
                  disabled={isSubmitting}
                  value={saleData.sale_bill_number}
                  onChange={(e) => setSaleData({ ...saleData, sale_bill_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                />
              </div>
              <div>
                <label htmlFor="sale_bill_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Sale Bill Date *
                </label>
                <input
                  type="date"
                  id="sale_bill_date"
                  required
                  disabled={isSubmitting}
                  value={saleData.sale_bill_date}
                  onChange={(e) => setSaleData({ ...saleData, sale_bill_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                />
              </div>
              <div>
                <label htmlFor="sold_to" className="block text-sm font-medium text-gray-700 mb-1">
                  Sold To *
                </label>
                <select
                  id="sold_to"
                  required
                  disabled={isSubmitting}
                  value={saleData.company_id}
                  onChange={(e) => setSaleData({ ...saleData, company_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                >
                  <option value="">Select Customer</option>
                  {customerOptions.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Available Reels Selection */}
          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-2">
              <h3 className="text-lg font-semibold text-gray-900">Select Reels</h3>
              <p className="text-sm text-gray-500">Choose reels from available inventory and set rates</p>
            </div>
            {isLoadingReels ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="text-sm text-gray-600">Loading available reels...</p>
                </div>
              </div>
            ) : availableReels.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md">
                No available reels in inventory. Please create a purchase first.
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
                {Object.entries(groupReelsByDateAndBill(availableReels))
                  .sort(([dateA], [dateB]) => {
                    // Sort dates descending (newest first)
                    return new Date(dateB).getTime() - new Date(dateA).getTime();
                  })
                  .map(([date, billGroups]) => (
                    <div key={date} className="space-y-3">
                      {/* Date Header */}
                      <div className="sticky top-0 bg-gray-50 border-b-2 border-gray-300 pb-2 -mt-2 pt-2 z-10">
                        <h4 className="text-base font-semibold text-gray-900">
                          {formatDateForDisplay(date)}
                        </h4>
                      </div>
                      
                      {/* Bill Number Groups */}
                      {Object.entries(billGroups).map(([billNumber, reels]) => (
                        <div key={`${date}-${billNumber}`} className="space-y-2 ml-4">
                          {/* Purchase Bill Number Header */}
                          <div className="bg-gray-100 border-l-4 border-blue-500 pl-3 py-2 rounded">
                            <h5 className="text-sm font-medium text-gray-800">
                              Purchase Bill: {billNumber || 'N/A'}
                            </h5>
                          </div>
                          
                          {/* Reels in this bill */}
                          <div className="space-y-2">
                            {reels.map((reel) => {
                              const isSelected = selectedReels.some(r => r.reel_id === reel.id);
                              return (
                                <div
                                  key={reel.id}
                                  className={`border rounded-lg p-4 ${
                                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                                  }`}
                                >
                                  <div className="flex items-start gap-4">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleReelSelection(reel.id)}
                                      disabled={isSubmitting}
                                      className="mt-1"
                                    />
                                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                                      <div>
                                        <span className="text-sm font-medium text-gray-700">Reel Number:</span>
                                        <p className="text-sm text-gray-900">{reel.reel_number || 'Not set'}</p>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium text-gray-700">GSM:</span>
                                        <p className="text-sm text-gray-900">{reel.gsm}</p>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium text-gray-700">Size:</span>
                                        <p className="text-sm text-gray-900">{reel.size} {reel.size_unit}</p>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium text-gray-700">Shade:</span>
                                        <p className="text-sm text-gray-900">{reel.shade}</p>
                                      </div>
                                    </div>
                                    {isSelected && (
                                      <div className="flex gap-2">
                                        <div className="w-32">
                                          <label className="block text-sm font-medium text-gray-700 mb-1">Reel Number *</label>
                                          <input
                                            type="text"
                                            required
                                            disabled={isSubmitting}
                                            value={selectedReels.find(r => r.reel_id === reel.id)?.reel_number || ''}
                                            onChange={(e) => updateSelectedReelNumber(reel.id, e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                                          />
                                        </div>
                                        <div className="w-32">
                                          <label className="block text-sm font-medium text-gray-700 mb-1">Rate *</label>
                                          <input
                                            type="number"
                                            step="0.01"
                                            required
                                            disabled={isSubmitting}
                                            value={selectedReels.find(r => r.reel_id === reel.id)?.rate || ''}
                                            onChange={(e) => updateSelectedReelRate(reel.id, e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
              Sale created successfully!
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || selectedReels.length === 0}
            className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Sale'}
          </button>
        </form>
      )}
    </div>
  );
}
