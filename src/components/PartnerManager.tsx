import React, { useState, useRef } from 'react';
import { Partner } from '../types';
import { Plus, Trash2, Edit2, Upload, HelpCircle, Save, X, Search, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';

interface PartnerManagerProps {
  partners: Partner[];
  onAddPartner: (partner: Omit<Partner, 'id'>) => void;
  onUpdatePartner: (partner: Partner) => void;
  onDeletePartner: (id: string) => void;
  onClearPartners: () => void;
}

// Preset logos to make it super easy
const PRESET_LOGOS = [
  {
    name: 'Tech Blue',
    url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%233b82f6"><rect width="100" height="100" rx="20"/><path d="M30 50 L45 65 L70 35" stroke="white" stroke-width="8" stroke-linecap="round" fill="none"/></svg>`,
  },
  {
    name: 'Finance Gold',
    url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%23eab308"><rect width="100" height="100" rx="20"/><text x="50" y="60" font-family="sans-serif" font-weight="bold" font-size="30" fill="white" text-anchor="middle">$$</text></svg>`,
  },
  {
    name: 'Energy Green',
    url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%2310b981"><rect width="100" height="100" rx="20"/><path d="M50 20 L30 55 L48 55 L35 85 L70 45 L52 45 Z" fill="white"/></svg>`,
  },
  {
    name: 'Creative Purple',
    url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%238b5cf6"><rect width="100" height="100" rx="20"/><circle cx="50" cy="50" r="20" fill="white"/><circle cx="50" cy="50" r="10" fill="%238b5cf6"/></svg>`,
  },
];

export default function PartnerManager({
  partners,
  onAddPartner,
  onUpdatePartner,
  onDeletePartner,
  onClearPartners,
}: PartnerManagerProps) {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter, Sort and Pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'original'>('asc'); // Default alphabetical
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 40;

  // 1. Filter partners
  const filteredPartners = partners.filter((partner) => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return true;
    return partner.name.toLowerCase().includes(search);
  });

  // 2. Sort partners
  const sortedAndFiltered = [...filteredPartners].sort((a, b) => {
    if (sortOrder === 'original') return 0;
    
    const nameA = a.name.trim().toLowerCase();
    const nameB = b.name.trim().toLowerCase();
    
    if (sortOrder === 'asc') {
      return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
    } else {
      return nameB.localeCompare(nameA, 'pt-BR', { sensitivity: 'base' });
    }
  });

  // 3. Paginate partners
  const totalPages = Math.ceil(sortedAndFiltered.length / ITEMS_PER_PAGE);
  const activePage = Math.min(currentPage, totalPages || 1);
  const startIndex = (activePage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedPartners = sortedAndFiltered.slice(startIndex, endIndex);

  // Auto Logo Search state
  const [logoSuggestions, setLogoSuggestions] = useState<Array<{ name: string; domain: string; logo: string }>>([]);
  const [isSearchingLogo, setIsSearchingLogo] = useState(false);
  const [showLogoDropdown, setShowLogoDropdown] = useState(false);
  const suggestTimeoutRef = useRef<any>(null);

  // Manual Logo Fetch state
  const [isUpdatingLogoId, setIsUpdatingLogoId] = useState<string | null>(null);

  const handleFetchLogoByName = async (partner: Partner) => {
    setIsUpdatingLogoId(partner.id);
    try {
      const response = await fetch(`/api/logo/search?query=${encodeURIComponent(partner.name)}`);
      const result = await response.json();
      if (result.success && Array.isArray(result.data) && result.data.length > 0) {
        const bestMatch = result.data[0];
        if (bestMatch.logo) {
          onUpdatePartner({
            ...partner,
            logoUrl: bestMatch.logo
          });
        } else {
          alert(`Nenhuma logo encontrada para "${partner.name}".`);
        }
      } else {
        alert(`Nenhuma logo encontrada para "${partner.name}".`);
      }
    } catch (err) {
      console.error("Error fetching logo:", err);
      alert("Erro ao buscar logo.");
    } finally {
      setIsUpdatingLogoId(null);
    }
  };

  const handleNameChange = (newName: string) => {
    setName(newName);
    
    if (suggestTimeoutRef.current) {
      clearTimeout(suggestTimeoutRef.current);
    }

    const trimmed = newName.trim();
    if (trimmed.length < 2) {
      setLogoSuggestions([]);
      setShowLogoDropdown(false);
      return;
    }

    setIsSearchingLogo(true);
    setShowLogoDropdown(true);

    suggestTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/logo/search?query=${encodeURIComponent(trimmed)}`);
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setLogoSuggestions(result.data);
        } else {
          setLogoSuggestions([]);
        }
      } catch (err) {
        console.error("Error fetching logo suggestions:", err);
        setLogoSuggestions([]);
      } finally {
        setIsSearchingLogo(false);
      }
    }, 400); // 400ms debounce
  };

  const handleLogoError = (e: React.SyntheticEvent<HTMLImageElement, Event>, partnerName: string, domain?: string) => {
    const target = e.currentTarget;
    const currentSrc = target.src;
    
    // Try to extract domain from src if not explicitly provided
    let cleanDomain = domain || "";
    if (!cleanDomain) {
      if (currentSrc.includes("logo.clearbit.com/")) {
        cleanDomain = currentSrc.split("logo.clearbit.com/")[1];
      } else if (currentSrc.includes("unavatar.io/")) {
        cleanDomain = currentSrc.split("unavatar.io/")[1];
      }
    }

    // Remove any trailing queries or slashes
    if (cleanDomain) {
      cleanDomain = cleanDomain.split("?")[0].split("/")[0];
    }

    if (cleanDomain) {
      // Step 1: If Clearbit failed, try unavatar.io
      if (currentSrc.includes("logo.clearbit.com")) {
        target.src = `https://unavatar.io/${cleanDomain}`;
        return;
      }
      // Step 2: If unavatar failed, try google favicon (128px)
      if (currentSrc.includes("unavatar.io")) {
        target.src = `https://www.google.com/s2/favicons?sz=128&domain=${cleanDomain}`;
        return;
      }
    }

    // Step 3: Default fallback to a beautifully styled, 100% offline inline SVG
    const words = partnerName.trim().split(/\s+/);
    const initials = words.slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');
    const colors = ['2e2640', '066d73', 'ff4545', '1e293b', '4f46e5', '0891b2', '059669', '7c3aed'];
    let hash = 0;
    for (let i = 0; i < partnerName.length; i++) {
      hash = partnerName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = colors[Math.abs(hash) % colors.length];
    const fallbackSvg = "data:image/svg+xml;utf8," + encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><rect width='100' height='100' rx='20' fill='#${color}'/><text x='50' y='58' font-family='sans-serif' font-weight='900' font-size='34' fill='#ffffff' text-anchor='middle'>${initials}</text></svg>`
    );
    if (target.src !== fallbackSvg) {
      target.src = fallbackSvg;
    }
  };

  const resetForm = () => {
    setName('');
    setLogoUrl('');
    setEditingId(null);
    setIsEditing(false);
    setLogoSuggestions([]);
    setShowLogoDropdown(false);
    if (suggestTimeoutRef.current) {
      clearTimeout(suggestTimeoutRef.current);
    }
  };

  const handleStartAdd = () => {
    resetForm();
    setIsEditing(true);
  };

  const handleStartEdit = (partner: Partner) => {
    setName(partner.name);
    setLogoUrl(partner.logoUrl);
    setEditingId(partner.id);
    setIsEditing(true);

    // Smoothly scroll window to top to show the edit form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, faça upload de uma imagem válida.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setLogoUrl(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Use a generic placeholder logo if none provided
    const finalLogo = logoUrl || `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%2364748b"><rect width="100" height="100" rx="20"/><text x="50" y="65" font-family="sans-serif" font-weight="900" font-size="40" fill="white" text-anchor="middle">${name.charAt(0).toUpperCase()}</text></svg>`;

    if (editingId) {
      onUpdatePartner({
        id: editingId,
        name: name.trim(),
        logoUrl: finalLogo,
      });
    } else {
      onAddPartner({
        name: name.trim(),
        logoUrl: finalLogo,
      });
    }
    resetForm();
  };  return (
    <div className="space-y-6" id="partner-manager-root">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-800 tracking-tight leading-none">Parceiros</h2>
          <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">Gerencie as empresas e instituições parceiras do módulo</p>
        </div>
        {!isEditing && (
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {partners.length > 0 && (
              showClearConfirm ? (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded text-xs animate-fade-in">
                  <span className="font-bold text-rose-800">Excluir todos?</span>
                  <button
                    onClick={() => {
                      onClearPartners();
                      setShowClearConfirm(false);
                    }}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-extrabold px-2.5 py-1 rounded uppercase tracking-wider cursor-pointer transition-colors"
                  >
                    Sim, Excluir
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-extrabold px-2.5 py-1 rounded uppercase tracking-wider cursor-pointer transition-colors"
                  >
                    Não
                  </button>
                </div>
              ) : (
                <button
                  id="clear-partners-btn"
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center gap-1.5 border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-bold px-4 py-2 rounded transition-all cursor-pointer whitespace-nowrap"
                  title="Excluir todos os parceiros cadastrados"
                >
                  <Trash2 size={13} /> Excluir Todos
                </button>
              )
            )}
            <button
              id="add-partner-btn"
              onClick={handleStartAdd}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded transition-all shadow-2xs cursor-pointer whitespace-nowrap"
            >
              <Plus size={14} /> Novo Parceiro
            </button>
          </div>
        )}
      </div>

      {isEditing && (
        <form id="partner-form" onSubmit={handleSave} className="bg-white rounded border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
              {editingId ? 'Editar Parceiro' : 'Cadastrar Novo Parceiro'}
            </h3>
            <button
              type="button"
              id="close-form-btn"
              onClick={resetForm}
              className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-4 flex flex-col justify-center">
              <div className="relative">
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                  <span>Nome da Empresa / Parceiro *</span>
                  <span className="text-[9px] text-indigo-600 font-bold lowercase tracking-normal">Busca de logo automática ativa</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    onFocus={() => {
                      if (name.trim().length >= 2) setShowLogoDropdown(true);
                    }}
                    onBlur={() => {
                      // Slight delay to allow clicking suggestions
                      setTimeout(() => setShowLogoDropdown(false), 200);
                    }}
                    placeholder="Ex: Google, Itaú, Ambev, Inteli"
                    className="w-full text-xs border border-slate-200 rounded px-3 py-2 bg-white text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all font-semibold animate-fade-in"
                    autoComplete="off"
                  />
                  {isSearchingLogo && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
                      <span className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                    </div>
                  )}
                </div>

                {/* Dropdown Suggestions */}
                {showLogoDropdown && name.trim().length >= 2 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded shadow-lg max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {isSearchingLogo && logoSuggestions.length === 0 && (
                      <div className="p-3 text-xs text-slate-400 flex items-center gap-2">
                        <span className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                        <span>Buscando marcas e logos...</span>
                      </div>
                    )}
                    {!isSearchingLogo && logoSuggestions.length === 0 && (
                      <div className="p-3 text-[11px] text-slate-400 italic">
                        Nenhuma marca correspondente encontrada.
                      </div>
                    )}
                    {logoSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setName(suggestion.name);
                          if (suggestion.logo) {
                            setLogoUrl(suggestion.logo);
                          }
                          setShowLogoDropdown(false);
                        }}
                        className="w-full text-left p-2 hover:bg-indigo-50/50 flex items-center justify-between gap-3 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          {suggestion.logo ? (
                            <img
                              src={suggestion.logo}
                              alt={suggestion.name}
                              className="w-7 h-7 object-contain rounded border border-slate-100 bg-white p-0.5"
                              referrerPolicy="no-referrer"
                              onError={(e) => handleLogoError(e, suggestion.name, suggestion.domain)}
                            />
                          ) : (
                            <div className="w-7 h-7 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                              {suggestion.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-700 block transition-colors leading-tight">
                              {suggestion.name}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono">
                              {suggestion.domain}
                            </span>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                          Selecionar
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                  Logo do Parceiro
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {/* File Upload Selector */}
                  <div
                    id="dropzone"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border border-dashed rounded p-4 text-center cursor-pointer flex flex-col items-center justify-center transition-colors h-36 ${
                      isDragging
                        ? 'border-indigo-500 bg-indigo-50/50'
                        : 'border-slate-200 bg-slate-50/40 hover:border-indigo-400 hover:bg-white'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    {logoUrl ? (
                      <div className="relative group">
                        <img
                          src={logoUrl}
                          alt="Preview"
                          className="w-16 h-16 object-contain rounded border border-slate-200 bg-white p-1"
                          referrerPolicy="no-referrer"
                          onError={(e) => handleLogoError(e, name)}
                        />
                        <div className="absolute inset-0 bg-black/40 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Upload size={14} className="text-white" />
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload size={20} className="text-slate-400 mb-1" />
                        <span className="text-xs text-slate-600 font-bold">Arraste ou clique</span>
                        <span className="text-[10px] text-slate-400 mt-1 font-medium">PNG, JPG, SVG</span>
                      </>
                    )}
                  </div>

                  {/* Preset Logos Select */}
                  <div className="border border-slate-200 rounded p-3 flex flex-col justify-between h-36 bg-white">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Escolha um preset:</span>
                    <div className="grid grid-cols-4 gap-2">
                      {PRESET_LOGOS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          title={preset.name}
                          onClick={() => setLogoUrl(preset.url)}
                          className={`p-1 rounded border transition-all hover:scale-105 bg-white flex items-center justify-center cursor-pointer ${
                            logoUrl === preset.url ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-slate-200'
                          }`}
                        >
                          <img
                            src={preset.url}
                            alt={preset.name}
                            className="w-8 h-8 rounded"
                            referrerPolicy="no-referrer"
                          />
                        </button>
                      ))}
                    </div>
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl('')}
                        className="text-[9px] text-red-500 font-extrabold uppercase hover:underline mt-1 text-left cursor-pointer"
                      >
                        Remover Logo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded transition-all shadow-2xs cursor-pointer"
            >
              <Save size={14} /> Salvar Parceiro
            </button>
          </div>
        </form>
      )}

      {/* Search and Sort controls */}
      {partners.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded p-4 flex flex-col md:flex-row md:items-center justify-between gap-4" id="partners-controls-bar">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <ArrowUpDown size={14} className="text-slate-400" />
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                Ordenação:
              </label>
            </div>
            <select
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value as 'asc' | 'desc' | 'original');
                setCurrentPage(1);
              }}
              className="text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-white text-slate-700 font-bold outline-none cursor-pointer focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all"
            >
              <option value="asc">Ordem Alfabética (A-Z)</option>
              <option value="desc">Ordem Alfabética (Z-A)</option>
              <option value="original">Ordem Original (HubSpot / Cadastro)</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Pesquisar parceiro por nome..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs border border-slate-200 rounded pl-8 pr-3 py-1.5 bg-white text-slate-800 placeholder-slate-400 font-semibold outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all"
              />
            </div>
            <div className="text-[11px] text-slate-500 font-bold shrink-0 self-center sm:self-auto bg-slate-100 px-2.5 py-1.5 rounded border border-slate-200/50">
              Total: {sortedAndFiltered.length} de {partners.length}
            </div>
          </div>
        </div>
      )}

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="partners-grid">
        {sortedAndFiltered.length === 0 ? (
          <div className="col-span-full border border-dashed border-slate-200 rounded p-10 text-center text-slate-500 bg-white">
            <HelpCircle className="mx-auto text-slate-300 mb-2" size={32} />
            <p className="font-semibold text-sm text-slate-700">Nenhum parceiro encontrado</p>
            <p className="text-xs text-slate-400 mt-1">Tente ajustar a busca ou cadastre novos parceiros.</p>
          </div>
        ) : (
          paginatedPartners.map((partner) => (
            <div
              key={partner.id}
              className="bg-white border border-slate-200 rounded p-4 flex items-start gap-4 shadow-2xs relative hover:shadow-xs transition-shadow"
            >
              <div className="w-12 h-12 rounded bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                <img
                  src={partner.logoUrl}
                  alt={partner.name}
                  className="w-10 h-10 object-contain rounded animate-fade-in"
                  referrerPolicy="no-referrer"
                  onError={(e) => handleLogoError(e, partner.name)}
                />
              </div>

              <div className="flex-1 min-w-0 pr-8 self-center">
                <h4 className="font-bold text-slate-900 text-sm tracking-tight truncate">{partner.name}</h4>
                <button
                  type="button"
                  onClick={() => handleFetchLogoByName(partner)}
                  disabled={isUpdatingLogoId === partner.id}
                  className="mt-1.5 text-[10px] text-indigo-600 hover:text-indigo-800 font-extrabold uppercase flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                  title="Buscar logo oficial automaticamente usando o nome do parceiro"
                >
                  {isUpdatingLogoId === partner.id ? (
                    <>
                      <span className="w-2 h-2 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                      <span>Buscando...</span>
                    </>
                  ) : (
                    <>
                      <Search size={10} />
                      <span>Puxar Logo por Nome</span>
                    </>
                  )}
                </button>
              </div>

              <div className="absolute top-3 right-3 flex items-center gap-1">
                {deleteConfirmId === partner.id ? (
                  <div className="flex items-center gap-1 bg-rose-50 border border-rose-100 p-1 rounded shadow-2xs z-10 animate-fade-in">
                    <span className="text-[9px] font-extrabold text-rose-700 uppercase tracking-wider px-1">Excluir?</span>
                    <button
                      onClick={() => {
                        onDeletePartner(partner.id);
                        setDeleteConfirmId(null);
                      }}
                      className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[9px] font-extrabold uppercase tracking-wider cursor-pointer"
                    >
                      Sim
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[9px] font-extrabold uppercase tracking-wider cursor-pointer"
                    >
                      Não
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => handleStartEdit(partner)}
                      className="text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-indigo-50 transition-colors cursor-pointer"
                      title="Editar parceiro"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(partner.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Excluir parceiro"
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 mt-2 bg-white p-4 rounded border border-slate-200 shadow-3xs" id="partners-pagination">
          <span className="text-xs text-slate-500 font-semibold">
            Mostrando <strong className="text-slate-800 font-bold">{startIndex + 1}</strong> a{' '}
            <strong className="text-slate-800 font-bold">{Math.min(endIndex, sortedAndFiltered.length)}</strong> de{' '}
            <strong className="text-slate-800 font-bold">{sortedAndFiltered.length}</strong> parceiros
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={activePage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              title="Página Anterior"
            >
              <ChevronLeft size={14} />
              <span className="hidden sm:inline pr-1">Anterior</span>
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show a maximum of 5 page buttons around activePage
                const shouldShow = page === 1 || page === totalPages || Math.abs(page - activePage) <= 1;
                const isGap = page !== 1 && page !== totalPages && Math.abs(page - activePage) === 2;
                
                if (isGap) {
                  return <span key={`gap-${page}`} className="text-slate-400 px-1 text-xs">...</span>;
                }
                if (!shouldShow) return null;

                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-[28px] h-7 px-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                      activePage === page
                        ? 'bg-slate-800 text-white border border-slate-800'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            <button
              disabled={activePage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              title="Próxima Página"
            >
              <span className="hidden sm:inline pl-1">Próxima</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
