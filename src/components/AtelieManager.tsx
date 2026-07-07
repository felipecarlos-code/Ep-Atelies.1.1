import { useState, FormEvent } from 'react';
import { Atelie, PRESET_COLORS } from '../types';
import { Plus, Trash2, Edit2, DoorOpen, Save, X, Users, MapPin, Layers } from 'lucide-react';

interface AtelieManagerProps {
  atelies: Atelie[];
  onAddAtelie: (atelie: Omit<Atelie, 'id'>) => void;
  onUpdateAtelie: (atelie: Atelie) => void;
  onDeleteAtelie: (id: string) => void;
  onClearAtelies: () => void;
}

const GROUP_COLORS = [
  { bg: 'bg-emerald-50/70 border-emerald-300', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', border: '#10b981', text: 'text-emerald-800', name: 'Esmeralda' },
  { bg: 'bg-amber-50/70 border-amber-300', badge: 'bg-amber-100 text-amber-800 border-amber-200', border: '#f59e0b', text: 'text-amber-800', name: 'Âmbar' },
  { bg: 'bg-rose-50/70 border-rose-300', badge: 'bg-rose-100 text-rose-800 border-rose-200', border: '#f43f5e', text: 'text-rose-800', name: 'Rosa' },
  { bg: 'bg-cyan-50/70 border-cyan-300', badge: 'bg-cyan-100 text-cyan-800 border-cyan-200', border: '#06b6d4', text: 'text-cyan-800', name: 'Ciano' },
  { bg: 'bg-violet-50/70 border-violet-300', badge: 'bg-violet-100 text-violet-800 border-violet-200', border: '#8b5cf6', text: 'text-violet-800', name: 'Violeta' },
];

export default function AtelieManager({
  atelies,
  onAddAtelie,
  onUpdateAtelie,
  onDeleteAtelie,
  onClearAtelies,
}: AtelieManagerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [block, setBlock] = useState('Térreo');
  const [capacity, setCapacity] = useState<number>(36);
  const [color, setColor] = useState('Indigo');
  const [composableWith, setComposableWith] = useState<string[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Sort atelies alphabetically by name (supporting pt-BR local rules)
  const sortedAtelies = [...atelies].sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base', numeric: true })
  );

  // Helper to find connected components of composable atelies
  const getJunctionGroups = () => {
    const visited = new Set<string>();
    const groups: string[][] = [];

    atelies.forEach(atelie => {
      if (!visited.has(atelie.id)) {
        // Find if this atelie has links
        const hasLinks = (atelie.composableWith && atelie.composableWith.length > 0) || 
                         atelies.some(other => other.composableWith?.includes(atelie.id));
        
        if (hasLinks) {
          const component: string[] = [];
          const queue = [atelie.id];
          visited.add(atelie.id);

          while (queue.length > 0) {
            const currentId = queue.shift()!;
            component.push(currentId);

            const neighbors = new Set<string>();
            const currentAtelie = atelies.find(a => a.id === currentId);
            if (currentAtelie?.composableWith) {
              currentAtelie.composableWith.forEach(id => neighbors.add(id));
            }
            atelies.forEach(other => {
              if (other.composableWith?.includes(currentId)) {
                neighbors.add(other.id);
              }
            });

            neighbors.forEach(neighborId => {
              if (!visited.has(neighborId)) {
                visited.add(neighborId);
                queue.push(neighborId);
              }
            });
          }
          // Only count as group if it's size > 1
          if (component.length > 1) {
            groups.push(component);
          }
        }
      }
    });

    return groups;
  };

  const resetForm = () => {
    setName('');
    setBlock('Térreo');
    setCapacity(36);
    setColor('Indigo');
    setComposableWith([]);
    setEditingId(null);
    setIsEditing(false);
  };

  const handleStartAdd = () => {
    resetForm();
    setIsEditing(true);
  };

  const handleStartEdit = (atelie: Atelie) => {
    setName(atelie.name);
    setBlock(atelie.block);
    setCapacity(atelie.capacity);
    setColor(atelie.color);
    setComposableWith(atelie.composableWith || []);
    setEditingId(atelie.id);
    setIsEditing(true);
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId) {
      onUpdateAtelie({
        id: editingId,
        name: name.trim(),
        block: block.trim(),
        capacity,
        color,
        composableWith,
      });
    } else {
      onAddAtelie({
        name: name.trim(),
        block: block.trim(),
        capacity,
        color,
        composableWith,
      });
    }
    resetForm();
  };

  return (
    <div className="space-y-6" id="atelie-manager-root">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-800 tracking-tight leading-none">Cadastro de Ateliês (Salas)</h2>
          <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">Gerencie as salas de aula físicas disponíveis para as Sprints</p>
        </div>
        {!isEditing && (
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {atelies.length > 0 && (
              showClearConfirm ? (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded text-xs animate-fade-in">
                  <span className="font-bold text-rose-800">Excluir todos?</span>
                  <button
                    onClick={() => {
                      onClearAtelies();
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
                  id="clear-atelies-btn"
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center gap-1.5 border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-bold px-4 py-2 rounded transition-all cursor-pointer"
                  title="Excluir todos os ateliês cadastrados"
                >
                  <Trash2 size={13} /> Excluir Todos
                </button>
              )
            )}
            <button
              id="add-atelie-btn"
              onClick={handleStartAdd}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded transition-all shadow-2xs cursor-pointer whitespace-nowrap"
            >
              <Plus size={14} /> Novo Ateliê
            </button>
          </div>
        )}
      </div>

      {isEditing && (
        <form id="atelie-form" onSubmit={handleSave} className="bg-white rounded border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
              {editingId ? 'Editar Ateliê' : 'Cadastrar Novo Ateliê'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                Nome do Ateliê *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Ateliê 1 - Turing"
                className="w-full text-xs border border-slate-200 rounded px-3 py-2 bg-white text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                Localização Bloco
              </label>
              <select
                value={block}
                onChange={(e) => setBlock(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded px-3 py-2 bg-white text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all font-semibold"
              >
                <option value="Térreo">Térreo</option>
                <option value="1ª Mezanino">1ª Mezanino</option>
                <option value="2ª Mezanino">2ª Mezanino</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                Capacidade Máxima
              </label>
              <input
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full text-xs border border-slate-200 rounded px-3 py-2 bg-white text-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                Cor de Destaque Visual
              </label>
              <div className="flex items-center gap-2 mt-1">
                {PRESET_COLORS.map((pColor) => (
                  <button
                    key={pColor.name}
                    type="button"
                    onClick={() => setColor(pColor.name)}
                    style={{ backgroundColor: pColor.value }}
                    title={pColor.name}
                    className={`w-5.5 h-5.5 rounded-full border transition-transform hover:scale-110 cursor-pointer ${
                      color === pColor.name ? 'border-slate-800 ring-2 ring-indigo-500/20 scale-105' : 'border-transparent'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Ateliês Componíveis */}
          <div className="bg-slate-50 rounded border border-slate-200/60 p-4 mt-2">
            <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Layers size={13} className="text-slate-400" />
              Ateliês Componíveis (Junção Física)
            </h4>
            <p className="text-[11px] text-slate-500 mb-3 font-medium">
              Selecione quais outros ateliês podem se juntar a este para formar um espaço unificado. Nas Sprints, as capacidades de ateliês componíveis alocados juntos serão somadas de forma inteligente.
            </p>
            {sortedAtelies.filter(a => a.id !== editingId).length === 0 ? (
              <span className="text-xs text-slate-400 italic font-medium">Cadastre outros ateliês primeiro para poder combiná-los.</span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sortedAtelies
                  .filter(a => a.id !== editingId)
                  .map(a => {
                    const isSelected = composableWith.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setComposableWith(composableWith.filter(id => id !== a.id));
                          } else {
                            setComposableWith([...composableWith, a.id]);
                          }
                        }}
                        className={`text-xs px-3 py-1.5 rounded border transition-all cursor-pointer font-bold flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-[10px]">{isSelected ? '✓' : '+'}</span> {a.name} ({a.capacity} vagas)
                      </button>
                    );
                  })}
              </div>
            )}
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
              <Save size={14} /> Salvar Ateliê
            </button>
          </div>
        </form>
      )}

      {/* Grid List of Ateliês */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="atelies-grid">
        {sortedAtelies.length === 0 ? (
          <div className="col-span-full border border-dashed border-slate-200 rounded p-10 text-center text-slate-500">
            <DoorOpen className="mx-auto text-slate-300 mb-2" size={32} />
            <p className="font-semibold text-sm text-slate-700">Nenhum Ateliê cadastrado</p>
            <p className="text-xs text-slate-400 mt-1">Cadastre as salas de aula para poder agendar as turmas</p>
          </div>
        ) : (
          sortedAtelies.map((atelie) => {
            const selectedColor = PRESET_COLORS.find((p) => p.name === atelie.color) || PRESET_COLORS[0];
            const groups = getJunctionGroups();
            const groupIndex = groups.findIndex(g => g.includes(atelie.id));
            const isGrouped = groupIndex !== -1;
            const groupStyle = isGrouped ? GROUP_COLORS[groupIndex % GROUP_COLORS.length] : null;

            return (
              <div
                key={atelie.id}
                className={`${isGrouped ? `${groupStyle?.bg} border-[2px]` : 'bg-white border-l-[3px] border-y border-r border-slate-200'} rounded p-4 shadow-2xs relative hover:shadow-xs transition-shadow`}
                style={isGrouped ? { borderColor: groupStyle?.border, borderLeftWidth: '6px' } : { borderLeftColor: selectedColor.value }}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded ${isGrouped ? groupStyle?.badge : selectedColor.badge} shrink-0`}>
                    <DoorOpen size={16} />
                  </div>

                  <div className="flex-1 min-w-0 pr-8">
                    <h4 className="font-bold text-slate-900 text-sm tracking-tight truncate flex items-center flex-wrap gap-1.5">
                      <span>{atelie.name}</span>
                      {isGrouped && (
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${groupStyle?.badge}`}>
                          Junção #{groupIndex + 1}
                        </span>
                      )}
                    </h4>
                    
                    <div className="flex flex-col gap-1 mt-2">
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin size={11} className="shrink-0 text-slate-400" />
                        <span className="truncate font-medium">{atelie.block || 'Local não informado'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Users size={11} className="shrink-0 text-slate-400" />
                        <span className="font-medium">Capacidade: <strong className="text-slate-700 font-bold">{atelie.capacity}</strong> alunos</span>
                      </div>
                      
                      {atelie.composableWith && atelie.composableWith.length > 0 && (
                        <div className={`mt-2.5 pt-2 border-t ${isGrouped ? 'border-slate-300/40' : 'border-slate-100/70'}`}>
                          <div className="text-[9px] font-extrabold text-slate-450 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Layers size={9} /> Componível com:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {atelie.composableWith.map(id => {
                              const comp = atelies.find(x => x.id === id);
                              if (!comp) return null;
                              return (
                                <span key={id} className={`text-[9.5px] font-bold border px-1.5 py-0.5 rounded ${isGrouped ? 'bg-white border-slate-300/60 text-slate-700' : 'bg-slate-100 border-slate-200/50 text-slate-600'}`}>
                                  {comp.name}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="absolute top-3 right-3 flex items-center gap-1">
                  {deleteConfirmId === atelie.id ? (
                    <div className="flex items-center gap-1 bg-rose-50 border border-rose-100 p-1 rounded shadow-2xs z-10 animate-fade-in">
                      <span className="text-[9px] font-extrabold text-rose-700 uppercase tracking-wider px-1">Excluir?</span>
                      <button
                        onClick={() => {
                          onDeleteAtelie(atelie.id);
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
                        onClick={() => handleStartEdit(atelie)}
                        className="text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-indigo-50 transition-colors cursor-pointer"
                        title="Editar Ateliê"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(atelie.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Excluir Ateliê"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
