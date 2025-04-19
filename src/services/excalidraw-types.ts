import type * as Y from 'yjs';
import type { ExcalidrawElement, Theme } from '@excalidraw/excalidraw/element/types'
import type { Language } from '@excalidraw/excalidraw/i18n'

export type ExcalidrawYMap = Y.Map<ExcalidrawElement>;

/** The config passed to data-excalidraw-config as initial config to Excalidraw editor in BASE64 */
export type ExcalidrawConfig = {
  /** The content encoded in UTF-8 of JSON type ExportedDataState, containing type, elements and appState */
  content: Array<number>,
  /** Only support JSON for now */
  contentType: 'application/json',
  /** Is it view only or not */
  viewModeEnabled: boolean,
  /** Light or dark theme */
  theme: Theme,
  /** Not supported for now. JSON encoded type ExportedLibraryData */
  library: string,
  /** Not supported for now */
  imageParams: {
    exportBackground: boolean;
    exportWithDarkMode: boolean;
    exportScale: 1 | 2 | 3;
  },
  /** Not supported for now */
  langCode: Language['code'],
  /** Diagram name */
  name: string | undefined,
};

export type ExcalidrawMessage = {
  type: 'change',
  content: Array<number>,
}
