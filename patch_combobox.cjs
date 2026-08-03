const fs = require('fs');
let code = fs.readFileSync('./src/components/DocumentSearch.tsx', 'utf8');

const stateHook = `  const [driveIdSelected, setDriveIdSelected] = useState<string | null>(null);`;
const stateHookNew = `  const [driveIdSelected, setDriveIdSelected] = useState<string | null>(null);

  const [turmaSearchTerm, setTurmaSearchTerm] = useState('');
  const [isTurmaDropdownOpen, setIsTurmaDropdownOpen] = useState(false);

  const validStagesCleanSearch = [
    'concluido',
    'concluidos', 
    'pendencia de projeto', 
    'patente', 
    'envio de prototipos', 
    'pre projeto',
    'pre-projeto',
    'pre projetos'
  ];

  const filteredTurmas = turmas.filter(t => {
    const ds = (t.dealstage || '').normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().trim();
    return validStagesCleanSearch.includes(ds);
  });

  const searchFilteredTurmas = filteredTurmas.filter(t => {
    const searchStr = \`\${t.name} \${t.projectTitle || ''}\`.toLowerCase();
    return searchStr.includes(turmaSearchTerm.toLowerCase());
  });`;

code = code.replace(stateHook, stateHookNew);

const oldSelect = `                        <select 
                          value={associationId}
                          onChange={(e) => setAssociationId(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white font-medium text-slate-700"
                        >
                          <option value="">-- Selecione para vincular --</option>
                          {turmas.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name} {t.projectTitle ? \` - \${t.projectTitle}\` : ''}
                            </option>
                          ))}
                        </select>`;

const newCombobox = `                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Buscar Negócio/Turma..."
                            value={associationId && !isTurmaDropdownOpen ? (filteredTurmas.find(t => t.id === associationId) ? \`\${filteredTurmas.find(t => t.id === associationId)?.name} \${filteredTurmas.find(t => t.id === associationId)?.projectTitle ? \`- \${filteredTurmas.find(t => t.id === associationId)?.projectTitle}\` : ''}\` : turmaSearchTerm) : turmaSearchTerm}
                            onChange={(e) => {
                              setTurmaSearchTerm(e.target.value);
                              setAssociationId('');
                              setIsTurmaDropdownOpen(true);
                            }}
                            onFocus={() => setIsTurmaDropdownOpen(true)}
                            onBlur={() => setTimeout(() => setIsTurmaDropdownOpen(false), 200)}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white font-medium text-slate-700"
                          />
                          {isTurmaDropdownOpen && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {searchFilteredTurmas.map(t => (
                                <div
                                  key={t.id}
                                  className="px-3 py-2 text-xs hover:bg-indigo-50 cursor-pointer text-slate-700"
                                  onMouseDown={(e) => {
                                    e.preventDefault(); // Prevent input blur
                                    setAssociationId(t.id);
                                    setTurmaSearchTerm(\`\${t.name} \${t.projectTitle ? \`- \${t.projectTitle}\` : ''}\`);
                                    setIsTurmaDropdownOpen(false);
                                  }}
                                >
                                  <div className="font-semibold">{t.name}</div>
                                  {t.projectTitle && <div className="text-[10px] text-slate-500 truncate">{t.projectTitle}</div>}
                                </div>
                              ))}
                              {searchFilteredTurmas.length === 0 && (
                                <div className="px-3 py-2 text-xs text-slate-500">Nenhum resultado encontrado.</div>
                              )}
                            </div>
                          )}
                        </div>`;

code = code.replace(oldSelect, newCombobox);

fs.writeFileSync('./src/components/DocumentSearch.tsx', code);
