import extensions from './extensions.json';

export function getExtension(basename: string) {
  return basename.toLowerCase().split('.').pop() ?? '';
}

export function isExtensionType(basename: string, ext: keyof typeof extensions): boolean {
  return extensions[ext].includes(getExtension(basename));
}

export function getExtensionType(basename: string): keyof typeof extensions | null {
  const file = getExtension(basename);
  for (const [type, exts] of Object.entries(extensions)) {
    if (exts.includes(file)) {
      return type as keyof typeof extensions;
    }
  }
  return null;
}
