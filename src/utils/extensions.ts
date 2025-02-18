import extensions from './extensions.json';

export function getExtension(basename: string) {
  return basename.toLowerCase().split('.').pop() ?? '';
}

export function isExtensionType(basename: string, ext: keyof typeof extensions): boolean {
  return extensions[ext].includes(getExtension(basename));
}
