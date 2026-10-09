export interface GoogleFontItem {
  family: string;
  category: 'sans-serif' | 'serif' | 'display' | 'handwriting' | 'monospace';
  description?: string;
}

export const POPULAR_GOOGLE_FONTS: GoogleFontItem[] = [
  // Sans-Serif
  { family: 'Inter', category: 'sans-serif', description: 'Clean, modern UI workhorse' },
  { family: 'Roboto', category: 'sans-serif', description: 'Geometric, friendly sans' },
  { family: 'Montserrat', category: 'sans-serif', description: 'Modern geometric display sans' },
  { family: 'Poppins', category: 'sans-serif', description: 'Geometric rounded sans-serif' },
  { family: 'Open Sans', category: 'sans-serif', description: 'Highly readable neutral sans' },
  { family: 'Lato', category: 'sans-serif', description: 'Warm and elegant proportions' },
  { family: 'Oswald', category: 'sans-serif', description: 'Condensed gothic headline style' },
  { family: 'Raleway', category: 'sans-serif', description: 'Elegant thin and headings sans' },
  { family: 'Nunito', category: 'sans-serif', description: 'Rounded, cheerful curves' },
  { family: 'Plus Jakarta Sans', category: 'sans-serif', description: 'Crisp contemporary sans' },
  { family: 'Outfit', category: 'sans-serif', description: 'Geometric studio brand font' },
  { family: 'Space Grotesk', category: 'sans-serif', description: 'Brutalist tech sans' },
  { family: 'Syne', category: 'sans-serif', description: 'Bold, avant-garde design font' },

  // Serif
  { family: 'Playfair Display', category: 'serif', description: 'High-contrast luxury editorial serif' },
  { family: 'Merriweather', category: 'serif', description: 'Sturdy, highly legible book serif' },
  { family: 'Lora', category: 'serif', description: 'Calligraphic contemporary serif' },
  { family: 'Cinzel', category: 'serif', description: 'Classical Roman monumental proportions' },
  { family: 'PT Serif', category: 'serif', description: 'Universal literary serif' },
  { family: 'Cormorant Garamond', category: 'serif', description: 'Traditional fine typography' },
  { family: 'EB Garamond', category: 'serif', description: 'Classic Renaissance Garamond' },
  { family: 'Bodoni Moda', category: 'serif', description: 'Dramatic Didone high-fashion serif' },
  { family: 'Spectral', category: 'serif', description: 'Crisp screen-optimized serif' },
  { family: 'Bitter', category: 'serif', description: 'Slab serif with strong personality' },

  // Display
  { family: 'Bebas Neue', category: 'display', description: 'Bold all-caps headline punch' },
  { family: 'Bangers', category: 'display', description: 'Mid-century comic book title font' },
  { family: 'Lobster', category: 'display', description: 'Retro bold sign-painter script' },
  { family: 'Righteous', category: 'display', description: 'Retro-futuristic Art Deco' },
  { family: 'Abril Fatface', category: 'display', description: 'Heavy 19th-century titling serif' },
  { family: 'Alfa Slab One', category: 'display', description: 'Ultra-black slab poster font' },
  { family: 'Press Start 2P', category: 'display', description: 'Classic 8-bit arcade pixel font' },
  { family: 'Audiowide', category: 'display', description: 'Sci-fi high-tech display font' },
  { family: 'Permanent Marker', category: 'display', description: 'Authentic felt-tip marker look' },
  { family: 'Shrikhand', category: 'display', description: 'Vibrant hand-lettered bold retro' },
  { family: 'Monoton', category: 'display', description: 'Triple-line disco retro display' },

  // Handwriting
  { family: 'Pacifico', category: 'handwriting', description: 'Fun 1950s American surf script' },
  { family: 'Dancing Script', category: 'handwriting', description: 'Bouncy, spontaneous informal script' },
  { family: 'Caveat', category: 'handwriting', description: 'Natural quick handwriting' },
  { family: 'Satisfy', category: 'handwriting', description: 'Timeless cursive brush lettering' },
  { family: 'Great Vibes', category: 'handwriting', description: 'Flowing formal calligraphy' },
  { family: 'Sacramento', category: 'handwriting', description: 'Commanding connected mono-line script' },
  { family: 'Shadows Into Light', category: 'handwriting', description: 'Neat feminine handwritten style' },
  { family: 'Indie Flower', category: 'handwriting', description: 'Carefree, bubble handwriting' },
  { family: 'Kaushan Script', category: 'handwriting', description: 'Unrefined, energetic brush script' },

  // Monospace
  { family: 'Fira Code', category: 'monospace', description: 'Modern programming monospace with ligatures' },
  { family: 'JetBrains Mono', category: 'monospace', description: 'Developer-oriented clean monospace' },
  { family: 'Space Mono', category: 'monospace', description: 'Eclectic retro-futuristic mono' },
  { family: 'Inconsolata', category: 'monospace', description: 'Clean humanistic monospace' },
  { family: 'Source Code Pro', category: 'monospace', description: 'Balanced Adobe terminal monospace' },
  { family: 'VT323', category: 'monospace', description: 'Vintage DEC terminal matrix font' },
];

export const SYSTEM_FONTS = [
  'Arial',
  'Helvetica',
  'Georgia',
  'Times New Roman',
  'Verdana',
  'Trebuchet MS',
  'Courier New',
  'Impact',
  'Comic Sans MS',
  'sans-serif',
  'serif',
  'monospace',
];

const DEFAULT_PROJECT_FONTS = [
  'Inter',
  'Roboto',
  'Montserrat',
  'Poppins',
  'Playfair Display',
  'Cinzel',
  'Bebas Neue',
  'Pacifico',
  'Caveat',
  'Fira Code',
  'Arial',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Impact',
];

const STORAGE_KEY = 'artdrawstudio_project_fonts_v2';
const loadedFontsSet = new Set<string>();

/**
 * Dynamically loads a Google Font by family name into document head.
 */
export async function loadGoogleFont(family: string): Promise<boolean> {
  if (!family || SYSTEM_FONTS.includes(family)) return true;
  if (loadedFontsSet.has(family)) return true;

  const fontId = `gfont-${family.replace(/\s+/g, '-').toLowerCase()}`;
  if (!document.getElementById(fontId)) {
    const link = document.createElement('link');
    link.id = fontId;
    link.rel = 'stylesheet';
    const encoded = encodeURIComponent(family);
    // Request weights from 100 to 900 including italic
    link.href = `https://fonts.googleapis.com/css2?family=${encoded}:ital,wght@0,100..900;1,100..900&display=swap`;
    document.head.appendChild(link);
  }

  loadedFontsSet.add(family);

  if ('fonts' in document) {
    try {
      await Promise.race([
        document.fonts.load(`16px "${family}"`),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
      return true;
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Loads a list of Google Fonts in parallel.
 */
export async function loadGoogleFonts(families: string[]): Promise<void> {
  await Promise.all(families.map((f) => loadGoogleFont(f)));
}

/**
 * Gets the current project's installed font list from localStorage.
 */
export function getProjectFonts(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to read project fonts from storage', e);
  }
  return DEFAULT_PROJECT_FONTS;
}

/**
 * Adds a font family to the project's installed list.
 */
export function addProjectFont(family: string): string[] {
  const current = getProjectFonts();
  if (!current.includes(family)) {
    const updated = [family, ...current];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save project fonts', e);
    }
    loadGoogleFont(family);
    return updated;
  }
  return current;
}

/**
 * Removes/deletes a font family from the project's installed list.
 */
export function removeProjectFont(family: string): string[] {
  const current = getProjectFonts();
  const updated = current.filter((f) => f !== family);
  // Ensure we keep at least system fonts
  const finalFonts = updated.length > 0 ? updated : DEFAULT_PROJECT_FONTS;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(finalFonts));
  } catch (e) {
    console.error('Failed to save project fonts', e);
  }
  return finalFonts;
}

/**
 * Preload all default & saved fonts.
 */
export function preloadProjectFonts(): void {
  const fonts = getProjectFonts();
  loadGoogleFonts(fonts);
}
