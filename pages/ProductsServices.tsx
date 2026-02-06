
import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Tag, Globe, MoreVertical, X, Check, Edit2, Trash2, AppWindow, Languages, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { useI18n } from '../contexts';
import { MOCK_PRODUCTS, MOCK_CATEGORIES, MOCK_APPS } from '../constants';
import { Product, ProductCategory, ProductPrice, LocalizedText } from '../types';

type Tab = 'list' | 'categories';

const PriceTag: React.FC<{ price: ProductPrice }> = ({ price }) => (
  <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 mr-2 mb-1">
    <span className="text-slate-400 font-sans">{price.region}:</span>
    {price.currency === 'USD' ? '$' : price.currency === 'CNY' ? '¥' : '€'}
    {price.amount.toFixed(2)}
  </span>
);

export const ProductsServices: React.FC = () => {
  const { t, locale } = useI18n();
  const [activeTab, setActiveTab] = useState<Tab>('list');
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [categories, setCategories] = useState<ProductCategory[]>(MOCK_CATEGORIES);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});
  
  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppId, setSelectedAppId] = useState<string>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // State for form language tab
  const [formLang, setFormLang] = useState<string>('en');

  // Helper to get text based on current locale, fallback to 'en', then first key
  const getLocalizedText = (textObj?: LocalizedText) => {
    if (!textObj) return '';
    return textObj[locale] || textObj['en'] || Object.values(textObj)[0] || '';
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedAppId, selectedCategoryId, selectedStatus, itemsPerPage]);

  // Filtering Logic
  const filteredProducts = products.filter(product => {
    const productName = getLocalizedText(product.name).toLowerCase();
    const matchesSearch = productName.includes(searchQuery.toLowerCase()) || 
                          product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesApp = selectedAppId === 'all' || product.appId === selectedAppId;
    const matchesCategory = selectedCategoryId === 'all' || product.categoryId === selectedCategoryId;
    // Note: status in type is 'active' | 'archived'. Mapped to 'active' | 'inactive' in filter for UI consistency
    const matchesStatus = selectedStatus === 'all' || 
                          (selectedStatus === 'active' && product.status === 'active') ||
                          (selectedStatus === 'inactive' && product.status === 'archived');

    return matchesSearch && matchesApp && matchesCategory && matchesStatus;
  });

  // Pagination Logic
  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  const handleEditProduct = (product?: Product) => {
    setFormLang(locale === 'zh' ? 'zh' : 'en');
    if (product) {
      setEditingProduct({ ...product });
    } else {
      setEditingProduct({
        appId: MOCK_APPS[0].id,
        name: { en: '', zh: '' },
        description: { en: '', zh: '' },
        prices: [{ region: 'Global', currency: 'USD', amount: 0 }],
        status: 'active'
      });
    }
    setIsModalOpen(true);
  };

  const handleLocalizedChange = (field: 'name' | 'description', value: string) => {
    setEditingProduct(prev => ({
      ...prev,
      [field]: {
        ...(prev[field] as LocalizedText),
        [formLang]: value
      }
    }));
  };

  const handlePriceChange = (index: number, field: keyof ProductPrice, value: string | number) => {
    const newPrices = [...(editingProduct.prices || [])];
    newPrices[index] = { ...newPrices[index], [field]: value };
    setEditingProduct({ ...editingProduct, prices: newPrices });
  };

  const addPriceRow = () => {
    setEditingProduct({
      ...editingProduct,
      prices: [...(editingProduct.prices || []), { region: 'CN', currency: 'CNY', amount: 0 }]
    });
  };

  const removePriceRow = (index: number) => {
    const newPrices = [...(editingProduct.prices || [])];
    newPrices.splice(index, 1);
    setEditingProduct({ ...editingProduct, prices: newPrices });
  };

  const getAppName = (appId: string) => {
    return MOCK_APPS.find(a => a.id === appId)?.name || appId;
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('products.title')}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t('products.subtitle')}</p>
        </div>
        <div className="flex bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'list' 
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {t('products.tabs.list')}
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'categories' 
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {t('products.tabs.categories')}
          </button>
        </div>
      </div>

      {activeTab === 'list' ? (
        /* Product List View */
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors duration-200">
          {/* Filters Bar */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex flex-wrap gap-4 w-full xl:w-auto">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('common.filter') + " SKU, Name..."}
                      className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
                
                {/* App Filter */}
                <div className="relative min-w-[160px]">
                    <select 
                        value={selectedAppId}
                        onChange={(e) => setSelectedAppId(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                    >
                        <option value="all">{t('common.allApps')}</option>
                        {MOCK_APPS.map(app => (
                            <option key={app.id} value={app.id}>{app.name}</option>
                        ))}
                    </select>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <AppWindow size={16} />
                    </div>
                </div>

                {/* Category Filter */}
                <div className="relative min-w-[160px]">
                    <select 
                        value={selectedCategoryId}
                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                    >
                        <option value="all">{t('common.allCategories')}</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <Tag size={16} />
                    </div>
                </div>

                {/* Status Filter */}
                <div className="relative min-w-[140px]">
                    <select 
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                    >
                        <option value="all">{t('common.allStatus')}</option>
                        <option value="active">{t('products.status.active')}</option>
                        <option value="inactive">{t('products.status.inactive')}</option>
                    </select>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <Filter size={16} />
                    </div>
                </div>
            </div>
            
            <button 
              onClick={() => handleEditProduct()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors w-full xl:w-auto justify-center"
            >
              <Plus size={18} /> {t('products.newProduct')}
            </button>
          </div>

          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3 font-medium">{t('products.table.name')}</th>
                  <th className="px-6 py-3 font-medium">{t('products.table.app')}</th>
                  <th className="px-6 py-3 font-medium">{t('products.table.type')}</th>
                  <th className="px-6 py-3 font-medium">{t('products.table.category')}</th>
                  <th className="px-6 py-3 font-medium">{t('products.table.pricing')}</th>
                  <th className="px-6 py-3 font-medium">{t('products.table.status')}</th>
                  <th className="px-6 py-3 font-medium text-right">{t('common.edit')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                          <Package size={20} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {getLocalizedText(product.name)}
                          </p>
                          <p className="text-xs text-slate-500 font-mono">{product.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                            <AppWindow size={14} className="text-slate-400" />
                            <span>{getAppName(product.appId)}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                         {t(`products.types.${product.type}`)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {categories.find(c => c.id === product.categoryId)?.name || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap max-w-xs">
                        {product.prices.map((p, idx) => <PriceTag key={idx} price={p} />)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                            product.status === 'active' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}>
                            {product.status === 'active' ? t('products.status.active') : t('products.status.inactive')}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleEditProduct(product)}
                        className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1"
                      >
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                    <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                            No products found matching filters.
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-600 dark:text-slate-400">
             <div className="flex items-center gap-4">
                <span>
                   {t('common.showing')} <span className="font-medium text-slate-900 dark:text-white">{Math.min(startIndex + 1, totalItems)}</span> {t('common.to')} <span className="font-medium text-slate-900 dark:text-white">{Math.min(endIndex, totalItems)}</span> {t('common.of')} <span className="font-medium text-slate-900 dark:text-white">{totalItems}</span> {t('common.results')}
                </span>
                
                <div className="flex items-center gap-2">
                    <span className="hidden sm:inline">{t('common.rowsPerPage')}:</span>
                    <select 
                        value={itemsPerPage}
                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option value={20}>20</option>
                        <option value={30}>30</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
             </div>

             <div className="flex items-center gap-2">
                <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                    <ChevronLeft size={16} /> {t('common.prev')}
                </button>
                <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                    {t('common.next')} <ChevronRight size={16} />
                </button>
             </div>
          </div>
        </div>
      ) : (
        /* Categories View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div 
             onClick={() => {}}
             className="flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
             <Plus size={32} className="text-slate-400 mb-2" />
             <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('products.newCategory')}</span>
          </div>
          {categories.map(cat => (
            <div key={cat.id} className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 relative group">
               <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                     <MoreVertical size={16} />
                  </button>
               </div>
               <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                  <Tag size={20} />
               </div>
               <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{cat.name}</h3>
               <p className="text-sm text-slate-500 dark:text-slate-400">{cat.description}</p>
               <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                  <span>ID: {cat.id}</span>
                  <span>Products linked</span>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingProduct.id ? t('common.edit') : t('products.newProduct')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Info */}
              <section className="space-y-4">
                 <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Package size={16} className="text-indigo-500" /> {t('products.form.basicInfo')}
                 </h4>

                 {/* Language Tabs for Form */}
                 <div className="flex border-b border-slate-200 dark:border-slate-700">
                   <button 
                      onClick={() => setFormLang('en')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                        formLang === 'en' 
                          ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
                          : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                   >
                     <Languages size={14} /> {t('products.form.lang.en')}
                   </button>
                   <button 
                      onClick={() => setFormLang('zh')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                        formLang === 'zh' 
                          ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
                          : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                   >
                     <Languages size={14} /> {t('products.form.lang.zh')}
                   </button>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 col-span-2">
                       <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('products.form.selectApp')}</label>
                       <div className="relative">
                            <select 
                                value={editingProduct.appId}
                                onChange={e => setEditingProduct({...editingProduct, appId: e.target.value})}
                                className="w-full px-3 py-2 pl-9 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                {MOCK_APPS.map(app => (
                                    <option key={app.id} value={app.id}>{app.name}</option>
                                ))}
                            </select>
                            <AppWindow size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                       </div>
                    </div>
                    
                    <div className="space-y-1.5 col-span-2">
                       <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                         {t('products.form.productName')} <span className="uppercase text-[10px] bg-slate-200 dark:bg-slate-700 px-1 rounded">{formLang}</span>
                       </label>
                       <input 
                         type="text" 
                         value={editingProduct.name?.[formLang] || ''}
                         onChange={(e) => handleLocalizedChange('name', e.target.value)}
                         className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                       />
                    </div>
                    
                    <div className="space-y-1.5 col-span-2">
                       <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                         {t('products.form.productDesc')} <span className="uppercase text-[10px] bg-slate-200 dark:bg-slate-700 px-1 rounded">{formLang}</span>
                       </label>
                       <textarea 
                         rows={2}
                         value={editingProduct.description?.[formLang] || ''}
                         onChange={(e) => handleLocalizedChange('description', e.target.value)}
                         className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                       />
                    </div>

                    <div className="space-y-1.5">
                       <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('products.form.skuCode')}</label>
                       <input 
                         type="text" 
                         value={editingProduct.sku}
                         onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})}
                         className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('products.form.selectCategory')}</label>
                       <select 
                         value={editingProduct.categoryId}
                         onChange={e => setEditingProduct({...editingProduct, categoryId: e.target.value})}
                         className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                       >
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                       </select>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('products.form.selectType')}</label>
                       <select 
                         value={editingProduct.type}
                         onChange={e => setEditingProduct({...editingProduct, type: e.target.value as any})}
                         className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                       >
                          <option value="subscription">{t('products.types.subscription')}</option>
                          <option value="one_time">{t('products.types.one_time')}</option>
                          <option value="usage_based">{t('products.types.usage_based')}</option>
                       </select>
                    </div>

                    {/* Status Select */}
                    <div className="space-y-1.5">
                       <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('products.form.status')}</label>
                       <select 
                         value={editingProduct.status}
                         onChange={e => setEditingProduct({...editingProduct, status: e.target.value as any})}
                         className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                       >
                          <option value="active">{t('products.status.active')}</option>
                          <option value="archived">{t('products.status.inactive')}</option>
                       </select>
                    </div>
                 </div>
              </section>

              {/* Pricing */}
              <section className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                 <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <Globe size={16} className="text-emerald-500" /> {t('products.form.pricingStrategy')}
                    </h4>
                    <button 
                       onClick={addPriceRow}
                       className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                       <Plus size={12} /> {t('products.form.addPrice')}
                    </button>
                 </div>
                 
                 <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 space-y-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                       <Check size={12} className="mt-0.5 text-emerald-500" /> 
                       {t('products.form.pricingNote')}
                    </p>
                    
                    {editingProduct.prices?.map((price, idx) => (
                       <div key={idx} className="flex gap-3 items-end">
                          <div className="flex-1 space-y-1">
                             <label className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">{t('products.form.region')}</label>
                             <select 
                                value={price.region}
                                onChange={(e) => handlePriceChange(idx, 'region', e.target.value)}
                                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                             >
                                <option value="Global">Global</option>
                                <option value="CN">China (CN)</option>
                                <option value="US">United States (US)</option>
                                <option value="EU">Europe (EU)</option>
                             </select>
                          </div>
                          <div className="w-24 space-y-1">
                             <label className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">{t('products.form.currency')}</label>
                             <select 
                                value={price.currency}
                                onChange={(e) => handlePriceChange(idx, 'currency', e.target.value)}
                                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                             >
                                <option value="USD">USD</option>
                                <option value="CNY">CNY</option>
                                <option value="EUR">EUR</option>
                             </select>
                          </div>
                          <div className="flex-1 space-y-1">
                             <label className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">{t('products.form.amount')}</label>
                             <input 
                                type="number"
                                value={price.amount}
                                onChange={(e) => handlePriceChange(idx, 'amount', parseFloat(e.target.value))}
                                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
                             />
                          </div>
                          <button 
                             onClick={() => removePriceRow(idx)}
                             className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-colors"
                          >
                             <Trash2 size={16} />
                          </button>
                       </div>
                    ))}
                 </div>
              </section>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end gap-3">
               <button 
                 onClick={() => setIsModalOpen(false)}
                 className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
               >
                 {t('common.cancel')}
               </button>
               <button 
                 onClick={() => setIsModalOpen(false)}
                 className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-none"
               >
                 {t('common.save')}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
