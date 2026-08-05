const fs = require('fs');
let code = fs.readFileSync('./api/app.ts', 'utf8');

code = code.replace(
  /1\. Empresa Parceira \("empresaParceira"\):[\s\S]*?2\. Datas de Assinatura/g,
  `1. Empresa Parceira ("empresaParceira"): 
   - Atenção máxima! Você DEVE identificar quem é a VERDADEIRA empresa parceira/contratada ativa descrita no preâmbulo e na folha de assinatura deste termo.
   - REGRA DE OURO: Procure no texto quem é designado expressamente como "PARCEIRO DE PROJETO" ou "PARCEIRO" na cláusula de qualificação das partes (ex: 'doravante denominada simplesmente "Instituto Ponte" ou "PARCEIRO DE PROJETO"'). O nome que antecede esta definição é o nome correto.
   - IMPORTANTE: "INTELI", "Instituto de Tecnologia e Liderança" ou "INSTITUTO BRASILEIRO DE TECNOLOGIA E CIÊNCIA DA COMPUTAÇÃO - IBTCC" somos NÓS (a instituição acadêmica). NUNCA liste o Inteli ou IBTCC como a Empresa Parceira.
   - Desconsidere o nosso nome (Inteli), deixe APENAS o nome do parceiro (ex: "Instituto Ponte").

2. Datas de Assinatura`
);

fs.writeFileSync('./api/app.ts', code);
