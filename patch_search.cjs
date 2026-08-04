const fs = require('fs');
let code = fs.readFileSync('./src/components/DocumentSearch.tsx', 'utf8');

// 1. Fix auth error
code = code.replace(
  "setAuthError(err.message || 'Erro ao fazer login com o Google.');",
  `if (err.code === 'auth/unauthorized-domain') {
        setAuthError('Domínio não autorizado. Por favor, adicione este domínio ao Firebase Console (Authentication > Settings > Authorized domains).');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('O login foi cancelado.');
      } else {
        setAuthError(err.message || 'Erro ao fazer login com o Google.');
      }`
);

// 2. Fix associationType onChange clearing
code = code.replace(
  "setAssociationId('');\\n                          }}",
  "setAssociationId('');\\n                            setTurmaSearchTerm('');\\n                          }}"
);

// 3. Fix onMouseDown to onClick
code = code.replace(
  "onMouseDown={(e) => {\\n                                    e.preventDefault(); // Prevent input blur",
  "onClick={(e) => {\\n                                    e.preventDefault(); // Prevent input blur"
);

// Also add onTouchStart to handle mobile just in case
code = code.replace(
  "onClick={(e) => {\\n                                    e.preventDefault(); // Prevent input blur",
  "onMouseDown={(e) => { e.preventDefault(); }}\\n                                  onClick={(e) => {\\n                                    e.preventDefault(); // Prevent input blur"
);

fs.writeFileSync('./src/components/DocumentSearch.tsx', code);
