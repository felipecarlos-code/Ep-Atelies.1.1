const fs = require('fs');
let code = fs.readFileSync('./api/app.ts', 'utf8');

code = code.replace(
  /1\. Empresa Parceira \("empresaParceira"\):[\s\S]*?2\. Datas de Assinatura/g,
  `1. Empresa Parceira ("empresaParceira"): 
   - Atenção máxima! Você DEVE identificar quem é a VERDADEIRA empresa parceira/contratada ativa descrita no preâmbulo e na folha de assinatura deste termo.
   - Procure no preâmbulo ou nas cláusulas quem é designado como "PARCEIRO DE PROJETO" ou "PARCEIRO".
   - IMPORTANTE: "INTELI", "Instituto de Tecnologia e Liderança" ou "INSTITUTO BRASILEIRO DE TECNOLOGIA E CIÊNCIA DA COMPUTAÇÃO - IBTCC" somos NÓS (a instituição acadêmica). NUNCA liste o Inteli ou IBTCC como a Empresa Parceira.
   - Retorne o nome oficial ou fantasia exclusivo da EMPRESA PARCEIRA (ex: "Instituto Ponte").

2. Datas de Assinatura`
);

fs.writeFileSync('./api/app.ts', code);
