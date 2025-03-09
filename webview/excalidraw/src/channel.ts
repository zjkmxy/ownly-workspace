import { serializeAsJSON } from '@excalidraw/excalidraw';
import { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import { AppState, BinaryFiles } from '@excalidraw/excalidraw/types/types';

// @ts-ignore
export const channel = new BroadcastChannel('excalidraw'); // TODO: multi-tab support?

const textEncoder = new TextEncoder();

const json2VSCode = (
  elements: readonly ExcalidrawElement[],
  appState: Partial<AppState>,
  files: BinaryFiles
) => {
  channel.postMessage({
    type: 'change',
    content: Array.from(textEncoder.encode(serializeAsJSON(elements, appState, files, 'local'))),
  });
};

export const sendChangesToVSCode = (contentType: string) => {
  if (contentType === 'application/json') {
    return json2VSCode;
  }
  throw new Error(`Unsupported content type: ${contentType}`);
};
