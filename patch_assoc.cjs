const fs = require('fs');
let code = fs.readFileSync('./src/components/DocumentSearch.tsx', 'utf8');

code = code.replace(
  `const [associationType, setAssociationType] = useState<'tapi' | 'termo' | null>(searchStateCache?.associationType || null);`,
  `const [associationType, setAssociationType] = useState<'tapi' | 'termo' | 'partner' | null>(searchStateCache?.associationType || null);`
);

code = code.replace(
  `    if (suggestedTurma) {
      setAssociationType('tapi');
      setAssociationId(suggestedTurma.id);
    } else if (suggestedPartner) {
      setAssociationType('termo');
      setAssociationId(suggestedPartner.id);
    } else {
      setAssociationType('tapi');
      setAssociationId(''); setTurmaSearchTerm('');
    }`,
  `    if (suggestedTurma) {
      setAssociationType('tapi');
      setAssociationId(suggestedTurma.id);
    } else if (suggestedPartner) {
      setAssociationType('partner');
      setAssociationId(suggestedPartner.id);
    } else {
      setAssociationType('tapi');
      setAssociationId(''); setTurmaSearchTerm('');
    }`
);

// Add logic to save to Partner
code = code.replace(
  `    } else if (associationType === 'termo') {
      const targetTurma = turmas.find(t => t.id === associationId);
      if (!targetTurma) return;

      const updatedTurma: Turma = {
        ...targetTurma,
        partnershipTermLink: selectedFile.webViewLink,
        partnershipTermValidity: analysisResult.dataValidade || undefined,
        partnershipTermStatus: analysisResult.statusDoc,
        partnershipTermSummary: analysisResult.resumoCritico
      };

      onUpdateTurma(updatedTurma);
      setIsLinkedSuccess(true);
      setTimeout(() => {
        setIsLinkedSuccess(false);
        setViewMode('report');
      }, 1500);
    }
  };`,
  `    } else if (associationType === 'termo') {
      const targetTurma = turmas.find(t => t.id === associationId);
      if (!targetTurma) return;

      const updatedTurma: Turma = {
        ...targetTurma,
        partnershipTermLink: selectedFile.webViewLink,
        partnershipTermValidity: analysisResult.dataValidade || undefined,
        partnershipTermStatus: analysisResult.statusDoc,
        partnershipTermSummary: analysisResult.resumoCritico
      };

      onUpdateTurma(updatedTurma);
      setIsLinkedSuccess(true);
      setTimeout(() => {
        setIsLinkedSuccess(false);
        setViewMode('report');
      }, 1500);
    } else if (associationType === 'partner') {
      const targetPartner = partners.find(p => p.id === associationId);
      if (!targetPartner) return;

      const updatedPartner = {
        ...targetPartner,
        partnershipTermLink: selectedFile.webViewLink,
        partnershipTermValidity: analysisResult.dataValidade || undefined,
        partnershipTermStatus: analysisResult.statusDoc,
        partnershipTermSummary: analysisResult.resumoCritico
      };

      onUpdatePartner(updatedPartner);
      setIsLinkedSuccess(true);
      setTimeout(() => {
        setIsLinkedSuccess(false);
        setViewMode('report');
      }, 1500);
    }
  };`
);

// We need to add filtered Partners logic
const filteredPartners = `  const searchFilteredTurmas = filteredTurmas.filter(t => {
    const term = turmaSearchTerm.toLowerCase();
    return t.name.toLowerCase().includes(term) || (t.projectTitle && t.projectTitle.toLowerCase().includes(term));
  }).slice(0, 5);

  const searchFilteredPartners = partners.filter(p => {
    const term = turmaSearchTerm.toLowerCase();
    return p.name.toLowerCase().includes(term);
  }).slice(0, 5);`;

code = code.replace(
  `  const searchFilteredTurmas = filteredTurmas.filter(t => {
    const term = turmaSearchTerm.toLowerCase();
    return t.name.toLowerCase().includes(term) || (t.projectTitle && t.projectTitle.toLowerCase().includes(term));
  }).slice(0, 5);`,
  filteredPartners
);

// We need to update the dropdown and input
code = code.replace(
  `                      {/* Select Association type */}
                      <div className="w-full md:w-1/3">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Onde salvar?</label>
                        <select 
                          value={associationType || ''}
                          onChange={(e) => {
                            setAssociationType(e.target.value as 'tapi' | 'termo');
                            setAssociationId(''); setTurmaSearchTerm('');
                          }}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                        >
                          <option value="tapi">Negócio / Turma (TAPI)</option>
                          <option value="termo">Negócio / Turma (Termo Parceria)</option>
                        </select>
                      </div>

                      {/* Select Association item ID */}
                      <div className="w-full md:w-2/3">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                          Selecione o Negócio/Turma correspondente
                        </label>
                        <div className="relative">
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
                                  onMouseDown={(e) => { e.preventDefault(); }}
                                  onClick={(e) => {
                                    e.preventDefault();
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
                          )}`,
  `                      {/* Select Association type */}
                      <div className="w-full md:w-1/3">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Onde salvar?</label>
                        <select 
                          value={associationType || ''}
                          onChange={(e) => {
                            setAssociationType(e.target.value as 'tapi' | 'termo' | 'partner');
                            setAssociationId(''); setTurmaSearchTerm('');
                          }}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                        >
                          <option value="tapi">Negócio / Turma (TAPI)</option>
                          <option value="termo">Negócio / Turma (Termo Parceria)</option>
                          <option value="partner">Empresa / Parceiro (Termo Parceria)</option>
                        </select>
                      </div>

                      {/* Select Association item ID */}
                      <div className="w-full md:w-2/3">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                          Selecione o correspondente
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder={associationType === 'partner' ? "Buscar Empresa..." : "Buscar Negócio/Turma..."}
                            value={associationId && !isTurmaDropdownOpen ? 
                              (associationType === 'partner' 
                                ? (partners.find(p => p.id === associationId)?.name || turmaSearchTerm)
                                : (filteredTurmas.find(t => t.id === associationId) ? \`\${filteredTurmas.find(t => t.id === associationId)?.name} \${filteredTurmas.find(t => t.id === associationId)?.projectTitle ? \`- \${filteredTurmas.find(t => t.id === associationId)?.projectTitle}\` : ''}\` : turmaSearchTerm)
                              ) : turmaSearchTerm}
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
                              {associationType === 'partner' ? (
                                <>
                                  {searchFilteredPartners.map(p => (
                                    <div
                                      key={p.id}
                                      className="px-3 py-2 text-xs hover:bg-indigo-50 cursor-pointer text-slate-700"
                                      onMouseDown={(e) => { e.preventDefault(); }}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        setAssociationId(p.id);
                                        setTurmaSearchTerm(p.name);
                                        setIsTurmaDropdownOpen(false);
                                      }}
                                    >
                                      <div className="font-semibold">{p.name}</div>
                                    </div>
                                  ))}
                                  {searchFilteredPartners.length === 0 && (
                                    <div className="px-3 py-2 text-xs text-slate-500">Nenhum parceiro encontrado.</div>
                                  )}
                                </>
                              ) : (
                                <>
                                  {searchFilteredTurmas.map(t => (
                                    <div
                                      key={t.id}
                                      className="px-3 py-2 text-xs hover:bg-indigo-50 cursor-pointer text-slate-700"
                                      onMouseDown={(e) => { e.preventDefault(); }}
                                      onClick={(e) => {
                                        e.preventDefault();
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
                                </>
                              )}
                            </div>
                          )}`
);

fs.writeFileSync('./src/components/DocumentSearch.tsx', code);
