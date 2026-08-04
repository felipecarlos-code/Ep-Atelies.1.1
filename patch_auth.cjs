const fs = require('fs');
let code = fs.readFileSync('./src/components/DocumentSearch.tsx', 'utf8');

code = code.replace(
  `      if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('Login cancelado.');
      } else {
        if (err.code === 'auth/unauthorized-domain') {
        setAuthError('Domínio não autorizado. Por favor, adicione este domínio ao Firebase Console (Authentication > Settings > Authorized domains).');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('O login foi cancelado.');
      } else {
        setAuthError(err.message || 'Erro ao fazer login com o Google.');
      }
      }`,
  `      if (err.code === 'auth/unauthorized-domain') {
        setAuthError('Domínio não autorizado. Por favor, adicione o link do site ao Firebase Console (Authentication > Settings > Authorized domains).');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('O login foi cancelado.');
      } else {
        setAuthError(err.message || 'Erro ao fazer login com o Google.');
      }`
);

fs.writeFileSync('./src/components/DocumentSearch.tsx', code);
