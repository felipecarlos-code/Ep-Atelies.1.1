import React from "react";
export const handleLogoError = (e: React.SyntheticEvent<HTMLImageElement, Event>, partnerName: string, domain?: string) => {
  const target = e.currentTarget;
  const currentSrc = target.src;
  
  // Try to extract domain from src if not explicitly provided
  let cleanDomain = domain || "";
  if (!cleanDomain) {
    if (currentSrc.includes("logo.clearbit.com/")) {
      cleanDomain = currentSrc.split("logo.clearbit.com/")[1];
    } else if (currentSrc.includes("unavatar.io/")) {
      cleanDomain = currentSrc.split("unavatar.io/")[1];
    }
  }

  // Remove any trailing queries or slashes
  if (cleanDomain) {
    cleanDomain = cleanDomain.split("?")[0].split("/")[0];
  }

  if (cleanDomain) {
    // Step 1: If Clearbit failed, try unavatar.io
    if (currentSrc.includes("logo.clearbit.com")) {
      target.src = `https://unavatar.io/${cleanDomain}`;
      return;
    }
    
    // Step 2: If unavatar failed, try google favicon (128px)
    if (currentSrc.includes("unavatar.io")) {
      target.src = `https://www.google.com/s2/favicons?sz=128&domain=${cleanDomain}`;
      return;
    }
  }

  // Step 3: Default fallback to a beautifully styled, 100% offline inline SVG
  const words = partnerName.trim().split(/\s+/);
  const initials = words.slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');
  const colors = ['2e2640', '066d73', 'ff4545', '1e293b', '4f46e5', '0891b2', '059669', '7c3aed'];
  let hash = 0;
  for (let i = 0; i < partnerName.length; i++) {
    hash = partnerName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = colors[Math.abs(hash) % colors.length];

  const fallbackSvg = "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'><rect width='100' height='100' rx='20' fill='#${color}'/><text x='50' y='58' font-family='sans-serif' font-weight='900' font-size='34' fill='#ffffff' text-anchor='middle'>${initials}</text></svg>`
  );

  if (target.src !== fallbackSvg) {
    target.src = fallbackSvg;
  }
};
