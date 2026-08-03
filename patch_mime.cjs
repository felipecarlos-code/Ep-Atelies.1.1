const fs = require('fs');
let code = fs.readFileSync('./api/app.ts', 'utf8');

const target = `    if (!aiClient) {
      return res.status(500).json({ success: false, error: "Gemini AI client not initialized on server. Configure GEMINI_API_KEY." });
    }`;

const newTarget = `    if (!aiClient) {
      return res.status(500).json({ success: false, error: "Gemini AI client not initialized on server. Configure GEMINI_API_KEY." });
    }

    const supportedMimes = [
      'application/pdf',
      'application/vnd.google-apps.document',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/msword'
    ];
    
    if (!supportedMimes.includes(mimeType) && !mimeType.startsWith('text/')) {
       return res.status(400).json({ success: false, error: "Formato de arquivo não suportado. Apenas PDF, Google Docs, Word e Textos são permitidos." });
    }`;

code = code.replace(target, newTarget);
fs.writeFileSync('./api/app.ts', code);
