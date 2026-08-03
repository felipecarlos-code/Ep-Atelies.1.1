const fs = require('fs');
let code = fs.readFileSync('./src/components/DocumentSearch.tsx', 'utf8');

code = code.replace(
  /const \[associationType, setAssociationType\] = useState<'turma' \| 'partner' \| null>\(null\);/,
  "const [associationType, setAssociationType] = useState<'tapi' | 'termo' | null>(null);"
);

const handleSaveAssociationOld = `  const handleSaveAssociation = () => {
    if (!selectedFile || !analysisResult) return;

    if (associationType === 'turma') {
      const targetTurma = turmas.find(t => t.id === associationId);
      if (!targetTurma) return;

      const updatedTurma: Turma = {
        ...targetTurma,
        tapiLink: selectedFile.webViewLink,
        tapiValidity: analysisResult.dataValidade || undefined,
        tapiStatus: analysisResult.statusDoc,
        tapiSummary: analysisResult.resumoCritico
      };

      onUpdateTurma(updatedTurma);
      setIsLinkedSuccess(true);
    } else if (associationType === 'partner') {
      const targetPartner = partners.find(p => p.id === associationId);
      if (!targetPartner) return;

      const updatedPartner: Partner = {
        ...targetPartner,
        partnershipTermLink: selectedFile.webViewLink,
        partnershipTermValidity: analysisResult.dataValidade || undefined,
        partnershipTermStatus: analysisResult.statusDoc,
        partnershipTermSummary: analysisResult.resumoCritico
      };

      onUpdatePartner(updatedPartner);
      setIsLinkedSuccess(true);
    }
  };`;

const handleSaveAssociationNew = `  const handleSaveAssociation = () => {
    if (!selectedFile || !analysisResult) return;

    if (associationType === 'tapi') {
      const targetTurma = turmas.find(t => t.id === associationId);
      if (!targetTurma) return;

      const updatedTurma: Turma = {
        ...targetTurma,
        tapiLink: selectedFile.webViewLink,
        tapiValidity: analysisResult.dataValidade || undefined,
        tapiStatus: analysisResult.statusDoc,
        tapiSummary: analysisResult.resumoCritico
      };

      onUpdateTurma(updatedTurma);
      setIsLinkedSuccess(true);
    } else if (associationType === 'termo') {
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
    }
  };`;

code = code.replace(handleSaveAssociationOld, handleSaveAssociationNew);

const selectSectionOld = `                    <div className="flex flex-col md:flex-row gap-3 items-end">
                      {/* Select Association type */}
                      <div className="w-full md:w-1/3">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Onde salvar?</label>
                        <select 
                          value={associationType || ''}
                          onChange={(e) => {
                            setAssociationType(e.target.value as 'turma' | 'partner');
                            setAssociationId('');
                          }}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                        >
                          <option value="turma">Negócio / Turma (TAPI)</option>
                          <option value="partner">Empresa Parceira (Termo Parceria)</option>
                        </select>
                      </div>

                      {/* Select Association item ID */}
                      <div className="w-full md:w-2/3">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                          Selecione o {associationType === 'turma' ? 'Negócio/Turma' : 'Parceiro'} correspondente
                        </label>
                        <select 
                          value={associationId}
                          onChange={(e) => setAssociationId(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white font-medium text-slate-700"
                        >
                          <option value="">-- Selecione para vincular --</option>
                          {associationType === 'turma' ? (
                            turmas.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.name} {t.projectTitle ? \` - \${t.projectTitle}\` : ''}
                              </option>
                            ))
                          ) : (
                            partners.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>`;

const selectSectionNew = `                    <div className="flex flex-col md:flex-row gap-3 items-end">
                      {/* Select Association type */}
                      <div className="w-full md:w-1/3">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Onde salvar?</label>
                        <select 
                          value={associationType || ''}
                          onChange={(e) => {
                            setAssociationType(e.target.value as 'tapi' | 'termo');
                            setAssociationId('');
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
                        <select 
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
                        </select>
                      </div>
                    </div>`;

code = code.replace(selectSectionOld, selectSectionNew);
fs.writeFileSync('./src/components/DocumentSearch.tsx', code);
