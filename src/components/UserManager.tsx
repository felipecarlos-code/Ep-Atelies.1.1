import React, { useState } from 'react';
import { AppUser } from '../types';
import { Plus, Trash2, Edit2, Shield, Mail, Check, X, ShieldAlert, UserPlus, Info } from 'lucide-react';

interface UserManagerProps {
  users: AppUser[];
  onAddUser: (user: Omit<AppUser, 'id'>) => void;
  onUpdateUser: (user: AppUser) => void;
  onDeleteUser: (id: string) => void;
  currentUserEmail: string | null;
}

const ALL_AVAILABLE_TABS = [
  { id: 'sprints', label: 'Alocações / Sprints', desc: 'Visualização e alteração de alocação de turmas e ateliês.' },
  { id: 'boletim', label: 'Boletim EP', desc: 'Visualização consolidada de parcerias e cronogramas.' },
  { id: 'atelies', label: 'Cadastro de Ateliê', desc: 'Gerenciamento dos blocos, cores e capacidades de ateliês.' },
  { id: 'turmas', label: 'Negócios / Turmas', desc: 'Edição de turmas, módulos, trimestre e ano de aplicação.' },
  { id: 'partners', label: 'Parceiros', desc: 'Gestão de empresas parceiras, logotipos e descrições.' },
  { id: 'busca_documentos', label: 'Busca de Documentos', desc: 'Pesquisa e extração de informações de TAPI e termos de parceria no Google Drive.' },
  { id: 'hubspot', label: 'Conexão CRM HubSpot', desc: 'Sincronização direta de dados de pipelines de vendas.' },
  { id: 'database', label: 'Conexão do Banco', desc: 'Verificação de status do banco de dados na nuvem.' },
  { id: 'users', label: 'Gerenciamento de Acesso', desc: 'Controle de cadastro de pessoas e permissões de abas.' }
];

export default function UserManager({
  users,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  currentUserEmail
}: UserManagerProps) {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [allowedTabs, setAllowedTabs] = useState<string[]>(['sprints', 'boletim']);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleToggleTab = (tabId: string) => {
    if (allowedTabs.includes(tabId)) {
      setAllowedTabs(allowedTabs.filter(t => t !== tabId));
    } else {
      setAllowedTabs([...allowedTabs, tabId]);
    }
  };

  const handleSelectAllTabs = () => {
    setAllowedTabs(ALL_AVAILABLE_TABS.map(t => t.id));
  };

  const handleClearAllTabs = () => {
    setAllowedTabs([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanName) {
      setErrorMsg('Por favor, informe o nome.');
      return;
    }
    if (!cleanEmail) {
      setErrorMsg('Por favor, informe o e-mail.');
      return;
    }

    // Verify duplication
    const duplicate = users.find(u => u.email.toLowerCase() === cleanEmail && u.id !== editingId);
    if (duplicate) {
      setErrorMsg('Este e-mail já está cadastrado.');
      return;
    }

    if (isEditing && editingId) {
      onUpdateUser({
        id: editingId,
        name: cleanName,
        email: cleanEmail,
        allowedTabs,
        isAdmin
      });
      setIsEditing(false);
      setEditingId(null);
    } else {
      onAddUser({
        name: cleanName,
        email: cleanEmail,
        allowedTabs,
        isAdmin
      });
    }

    // Reset Form
    setName('');
    setEmail('');
    setIsAdmin(false);
    setAllowedTabs(['sprints', 'boletim']);
  };

  const handleStartEdit = (user: AppUser) => {
    setIsEditing(true);
    setEditingId(user.id);
    setName(user.name);
    setEmail(user.email);
    setIsAdmin(user.isAdmin);
    setAllowedTabs(user.allowedTabs || []);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingId(null);
    setName('');
    setEmail('');
    setIsAdmin(false);
    setAllowedTabs(['sprints', 'boletim']);
    setErrorMsg(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6" id="user-manager-root">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0f4c5c] flex items-center gap-2">
            <Shield size={26} />
            Controle de Acessos
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Cadastre os membros da equipe e defina exatamente quais abas do sistema cada pessoa pode acessar.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Registration Form Panel */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs h-fit">
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            {isEditing ? <Edit2 size={18} className="text-amber-500" /> : <UserPlus size={18} className="text-[#0f4c5c]" />}
            {isEditing ? 'Editar Usuário e Permissões' : 'Cadastrar Nova Pessoa'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Nome Completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Ana Souza"
                className="w-full text-sm px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f4c5c]/20 focus:border-[#0f4c5c]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">E-mail (Google Account)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ex: ana.souza@inteli.edu.br"
                  className="w-full text-sm pl-9 pr-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f4c5c]/20 focus:border-[#0f4c5c]"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                A pessoa usará este e-mail para fazer login via conta Google.
              </p>
            </div>

            {/* Toggle Admin */}
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex items-start gap-3">
              <input
                type="checkbox"
                id="is-admin-checkbox"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
                className="mt-1 h-4 w-4 text-[#0f4c5c] focus:ring-[#0f4c5c]/20 border-slate-300 rounded cursor-pointer"
              />
              <div className="cursor-pointer select-none" onClick={() => setIsAdmin(!isAdmin)}>
                <label htmlFor="is-admin-checkbox" className="text-xs font-bold text-slate-700 block cursor-pointer">
                  Administrador Geral
                </label>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Permite gerenciar outros usuários, conectar bancos e CRM, além de acessar tudo.
                </span>
              </div>
            </div>

            {/* Tabs Access Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Abas Permitidas
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllTabs}
                    className="text-[10px] text-[#0f4c5c] font-semibold hover:underline"
                  >
                    Selecionar Todas
                  </button>
                  <span className="text-slate-300 text-xs">|</span>
                  <button
                    type="button"
                    onClick={handleClearAllTabs}
                    className="text-[10px] text-rose-600 font-semibold hover:underline"
                  >
                    Limpar Todas
                  </button>
                </div>
              </div>

              <div className="border border-slate-100 rounded-lg overflow-hidden max-h-[220px] overflow-y-auto divide-y divide-slate-50 scrollbar-thin">
                {ALL_AVAILABLE_TABS.map((tab) => {
                  const isChecked = allowedTabs.includes(tab.id);
                  return (
                    <div 
                      key={tab.id} 
                      className={`p-2.5 flex items-start gap-2.5 transition-colors cursor-pointer hover:bg-slate-50 ${isChecked ? 'bg-slate-50/50' : ''}`}
                      onClick={() => handleToggleTab(tab.id)}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by div click
                        className="mt-0.5 h-3.5 w-3.5 text-[#0f4c5c] focus:ring-[#0f4c5c]/20 border-slate-300 rounded"
                      />
                      <div>
                        <span className="text-xs font-semibold text-slate-700 block leading-tight">
                          {tab.label}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5 leading-normal">
                          {tab.desc}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {errorMsg && (
              <div className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 p-2.5 rounded-lg">
                {errorMsg}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 bg-[#0f4c5c] hover:bg-[#0b3a47] text-white text-xs font-bold py-2.5 px-4 rounded-lg uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isEditing ? <Check size={14} /> : <Plus size={14} />}
                {isEditing ? 'Salvar Edição' : 'Cadastrar Pessoa'}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold py-2.5 px-4 rounded-lg uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* User Directory List Panel */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800">
              Membros Cadastrados ({users.length})
            </h2>
            <div className="bg-amber-50 border border-amber-200/60 rounded px-2 py-1 flex items-center gap-1 text-[11px] text-amber-700">
              <Info size={12} className="shrink-0" />
              <span>Apenas e-mails cadastrados aqui terão acesso</span>
            </div>
          </div>

          {users.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl">
              <ShieldAlert size={40} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-500">Nenhum membro cadastrado</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Registre os membros da sua equipe para que eles possam autenticar-se e acessar o sistema.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {users.map((user) => {
                const isCurrentUser = currentUserEmail && user.email.toLowerCase() === currentUserEmail.toLowerCase();
                return (
                  <div key={user.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5 max-w-lg">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-800">{user.name}</span>
                        {user.isAdmin && (
                          <span className="bg-[#0f4c5c]/10 text-[#0f4c5c] text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Shield size={10} />
                            Admin
                          </span>
                        )}
                        {isCurrentUser && (
                          <span className="bg-indigo-50 text-indigo-700 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded">
                            Você
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Mail size={13} className="text-slate-400" />
                        {user.email}
                      </div>

                      {/* Allowed Tabs Badges */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {user.isAdmin ? (
                          <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded">
                            Todas as abas (Super Admin)
                          </span>
                        ) : user.allowedTabs && user.allowedTabs.length > 0 ? (
                          user.allowedTabs.map((tabId) => {
                            const tabInfo = ALL_AVAILABLE_TABS.find(t => t.id === tabId);
                            return (
                              <span 
                                key={tabId} 
                                className="bg-slate-50 border border-slate-100 text-slate-500 text-[10px] px-1.5 py-0.5 rounded"
                              >
                                {tabInfo ? tabInfo.label : tabId}
                              </span>
                            );
                          })
                        ) : (
                          <span className="bg-rose-50 text-rose-600 text-[10px] font-semibold px-2 py-0.5 rounded">
                            Sem acesso (0 abas)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => handleStartEdit(user)}
                        className="p-1.5 text-slate-400 hover:text-[#0f4c5c] hover:bg-slate-50 rounded transition-colors cursor-pointer"
                        title="Editar Permissões"
                      >
                        <Edit2 size={16} />
                      </button>

                      {deleteConfirmId === user.id ? (
                        <div className="flex items-center gap-1 bg-rose-50 border border-rose-100 rounded px-1.5 py-1">
                          <span className="text-[10px] font-bold text-rose-700">Confirmar?</span>
                          <button
                            onClick={() => {
                              onDeleteUser(user.id);
                              setDeleteConfirmId(null);
                            }}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[9px] px-1.5 py-0.5 rounded cursor-pointer"
                          >
                            Sim
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-slate-500 hover:text-slate-700 font-bold text-[9px] px-1 py-0.5 cursor-pointer"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(user.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Excluir Usuário"
                          disabled={isCurrentUser} // Prevent deleting yourself
                          style={{ opacity: isCurrentUser ? 0.3 : 1 }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
