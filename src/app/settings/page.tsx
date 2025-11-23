'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';

interface Company {
  id: number;
  name: string;
  type: 'mill' | 'customer';
  created_at: string;
  updated_at: string;
}

export default function SettingsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', type: 'mill' as 'mill' | 'customer' });
  const [addForm, setAddForm] = useState({ name: '', type: 'mill' as 'mill' | 'customer' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/companies');
      const data = await response.json();
      
      if (data.success) {
        setCompanies(data.data);
      } else {
        setError(data.error || 'Failed to load companies');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) {
      setError('Company name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });

      const data = await response.json();
      
      if (data.success) {
        setAddForm({ name: '', type: 'mill' });
        await loadCompanies();
      } else {
        setError(data.error || 'Failed to create company');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create company');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (company: Company) => {
    setEditingId(company.id);
    setEditForm({ name: company.name, type: company.type });
  };

  const handleUpdate = async (id: number) => {
    if (!editForm.name.trim()) {
      setError('Company name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const response = await fetch(`/api/companies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      const data = await response.json();
      
      if (data.success) {
        setEditingId(null);
        await loadCompanies();
      } else {
        setError(data.error || 'Failed to update company');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update company');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this company?')) {
      return;
    }

    try {
      setDeletingId(id);
      setError(null);
      const response = await fetch(`/api/companies/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        await loadCompanies();
      } else {
        setError(data.error || 'Failed to delete company');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete company');
    } finally {
      setDeletingId(null);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', type: 'mill' });
  };

  const mills = companies.filter(c => c.type === 'mill');
  const customers = companies.filter(c => c.type === 'customer');

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link 
            href="/" 
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Company Settings</h1>
          <p className="text-gray-600 mt-1">Manage mills and customers</p>
        </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Add Company Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Company</h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="add-name" className="block text-sm font-medium text-gray-700 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                id="add-name"
                required
                disabled={isSubmitting}
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter company name"
              />
            </div>
            <div>
              <label htmlFor="add-type" className="block text-sm font-medium text-gray-700 mb-1">
                Type *
              </label>
              <select
                id="add-type"
                required
                disabled={isSubmitting}
                value={addForm.type}
                onChange={(e) => setAddForm({ ...addForm, type: e.target.value as 'mill' | 'customer' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="mill">Mill</option>
                <option value="customer">Customer</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adding...' : 'Add Company'}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading companies...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mills Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Mills ({mills.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mills.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-6 py-4 text-center text-sm text-gray-500">
                        No mills found
                      </td>
                    </tr>
                  ) : (
                    mills.map((company) => (
                      <tr key={company.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingId === company.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                disabled={isSubmitting}
                              />
                              <select
                                value={editForm.type}
                                onChange={(e) => setEditForm({ ...editForm, type: e.target.value as 'mill' | 'customer' })}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                disabled={isSubmitting}
                              >
                                <option value="mill">Mill</option>
                                <option value="customer">Customer</option>
                              </select>
                            </div>
                          ) : (
                            <span className="text-sm font-medium text-gray-900">{company.name}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {editingId === company.id ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleUpdate(company.id)}
                                disabled={isSubmitting}
                                className="text-green-600 hover:text-green-900 disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                disabled={isSubmitting}
                                className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleEdit(company)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(company.id)}
                                disabled={deletingId === company.id}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50"
                              >
                                {deletingId === company.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Customers Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Customers ({customers.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-6 py-4 text-center text-sm text-gray-500">
                        No customers found
                      </td>
                    </tr>
                  ) : (
                    customers.map((company) => (
                      <tr key={company.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingId === company.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                disabled={isSubmitting}
                              />
                              <select
                                value={editForm.type}
                                onChange={(e) => setEditForm({ ...editForm, type: e.target.value as 'mill' | 'customer' })}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                disabled={isSubmitting}
                              >
                                <option value="mill">Mill</option>
                                <option value="customer">Customer</option>
                              </select>
                            </div>
                          ) : (
                            <span className="text-sm font-medium text-gray-900">{company.name}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {editingId === company.id ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleUpdate(company.id)}
                                disabled={isSubmitting}
                                className="text-green-600 hover:text-green-900 disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                disabled={isSubmitting}
                                className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleEdit(company)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(company.id)}
                                disabled={deletingId === company.id}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50"
                              >
                                {deletingId === company.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

