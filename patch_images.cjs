const fs = require('fs');
let code = fs.readFileSync('./src/components/BoletimPrintV3.tsx', 'utf8');

const importTarget = `import { cleanOrDetectCourse } from './TurmaManager';`;
const newImports = `import { cleanOrDetectCourse } from './TurmaManager';
import imgPage0 from '../assets/images/regenerated_image_1784813520556.png';
import imgPage1 from '../assets/images/regenerated_image_1784813521950.png';
import imgPage2 from '../assets/images/regenerated_image_1784813523263.png';
`;

code = code.replace(importTarget, newImports);

const imgTarget = `<img src={campusImgSrc} alt="Campus" className="w-full h-full object-cover" />`;
const newImg = `<img src={pageIndex === 0 ? imgPage0 : pageIndex === 1 ? imgPage1 : pageIndex === 2 ? imgPage2 : campusImgSrc} alt="Campus" className="w-full h-full object-cover" />`;

code = code.replace(imgTarget, newImg);

fs.writeFileSync('./src/components/BoletimPrintV3.tsx', code);
console.log('Patched V3 images');
