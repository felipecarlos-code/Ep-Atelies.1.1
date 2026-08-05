const fs = require('fs');
let code = fs.readFileSync('./api/app.ts', 'utf8');

const regex = /const systemInstruction = `Você é um assistente especialista[\s\S]*?\];\n\s*\}/;

const newSystemInstruction = `const systemInstruction = \`Analise o doc do Inteli ("\${fileName || "N/A"}").
Retorne um JSON exato (sem formatação markdown) com:
{
  "tituloProjeto": "Título do projeto ou null",
  "empresaParceira": "Nome do Parceiro real (NÃO listar Inteli, Instituto de Tecnologia e Liderança, ou IBTCC)",
  "dataAssinatura": "DD/MM/AAAA ou null",
  "dataValidade": "Calculada (dataAssinatura + vigência, ex: 24 meses). DD/MM/AAAA ou null",
  "resumoCritico": "Resumo de 1-2 frases do escopo",
  "statusDoc": "Ativo"
}\`;

      if (actualMimeType === 'text/plain') {
        let textContent = fileBuffer.toString('utf-8');
        // OTIMIZAÇÃO DE TOKENS: Para documentos longos, pegar o início (preâmbulo/partes) e fim (assinaturas/datas)
        const MAX_CHARS = 10000;
        if (textContent.length > MAX_CHARS) {
          textContent = textContent.substring(0, 5000) + 
            "\\n\\n...[TEXTO INTERMEDIÁRIO OMITIDO PARA ECONOMIA DE TOKENS]...\\n\\n" + 
            textContent.substring(textContent.length - 5000);
        }
        contents = [
          {
            text: \`\${systemInstruction}\\n\\nConteúdo do documento:\\n\${textContent}\`
          }
        ];
      }`;

if (regex.test(code)) {
  code = code.replace(regex, newSystemInstruction);
  fs.writeFileSync('./api/app.ts', code);
  console.log("Substituted system instruction successfully.");
} else {
  console.log("Could not match the regex for system instruction.");
}
