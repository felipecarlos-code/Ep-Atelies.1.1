const fs = require('fs');
let code = fs.readFileSync('./api/app.ts', 'utf8');

code = code.replace(
  `const timeoutId = setTimeout(() => controller.abort(), 6000); // Strict 6-second timeout`,
  `const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased 15-second timeout`
);
code = code.replace(
  `message: isTimeout 
          ? "A requisição ao Supabase expirou (timeout de 6s). Verifique se o seu projeto do Supabase está ativo/pausado." `,
  `message: isTimeout 
          ? "A requisição ao Supabase expirou (timeout de 15s). Verifique se o seu projeto do Supabase está ativo/pausado." `
);
code = code.replace(
  `? "A requisição ao Supabase expirou (timeout de 6s). Verifique se o seu projeto do Supabase está ativo/pausado."`,
  `? "A requisição ao Supabase expirou (timeout de 15s). Verifique se o seu projeto do Supabase está ativo/pausado."`
);

fs.writeFileSync('./api/app.ts', code);
