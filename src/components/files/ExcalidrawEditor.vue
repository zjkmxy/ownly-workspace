<template>
  <div ref="excalidraw" class="excalidraw-wrapper">Loading...</div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, type PropType, ref, watch, useTemplateRef } from 'vue';

import * as Y from 'yjs';
import { createRoot, type Root } from 'react-dom/client';
import React from 'react';
import '@excalidraw/excalidraw/index.css';
import { Excalidraw } from '@excalidraw/excalidraw';
import type {
  ExcalidrawElement,
  OrderedExcalidrawElement,
} from '@excalidraw/excalidraw/element/types';
import type { ImportedDataState } from '@excalidraw/excalidraw/data/types';
import type { AppState, ExcalidrawImperativeAPI, BinaryFiles } from '@excalidraw/excalidraw/types';
import { excalidrawToFile } from '@/services/excalidraw-types';
import { debounce } from 'lodash-es';

// Define global constants
(window as any).EXCALIDRAW_EXPORT_SOURCE = globalThis.origin;
(window as any).EXCALIDRAW_ASSET_PATH = '/';

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  yjson: {
    type: Object as PropType<Y.Map<ExcalidrawElement>>,
    required: true,
  },
});

const scene = ref<ImportedDataState>();
const excalidrawAPI = ref<ExcalidrawImperativeAPI>();

const compareAndUpdateYMap = (newScene: ImportedDataState, yjson: Y.Map<ExcalidrawElement>) => {
  const newMap = new Map((newScene.elements ?? []).map((ele) => [ele.id, ele]));
  Y.transact(
    yjson.doc!,
    () => {
      for (const [id, ele] of newMap) {
        const eleJson = JSON.stringify(ele);
        if (!yjson.has(id)) {
          // New item, needs deep copy
          yjson.set(id, JSON.parse(eleJson));
          continue;
        }
        const oldEle = yjson.get(id);
        // Tried to compare version / versionNonce, not working since shallow copy issue
        if (JSON.stringify(oldEle) !== eleJson) {
          // Modified item, needs deep copy
          // Since we do not have finer granularity for now, update the whole element.
          yjson.set(id, JSON.parse(eleJson));
        }
      }
      // Delete items
      for (const id of yjson.keys()) {
        if (!newMap.has(id)) {
          yjson.delete(id);
        }
      }
    },
    'excalidraw',
    true,
  );
};

const onEditorChange = (
  elements: readonly OrderedExcalidrawElement[],
  appState: AppState,
  files: BinaryFiles,
) => {
  const newDocFile = excalidrawToFile(elements, appState, files);
  compareAndUpdateYMap(newDocFile, props.yjson);
  scene.value = newDocFile;
};

const observer = (event: Y.YMapEvent<ExcalidrawElement>) => {
  if (event.transaction.origin === 'excalidraw' || event.transaction.local) {
    // Ignore local changes; do not reload
    return;
  }
  excalidrawAPI.value?.updateScene({
    elements: Array.from(props.yjson.values()),
  });
};

let root: Root | undefined;
const excalidraw = useTemplateRef('excalidraw');
const create = () => {
  scene.value = excalidrawToFile(Array.from(props.yjson.values()));
  props.yjson.observe(observer);

  root = createRoot(excalidraw.value!);
  root.render(
    React.createElement(Excalidraw, {
      UIOptions: {
        canvasActions: {
          loadScene: false,
          saveToActiveFile: false,
        },
      },
      langCode: 'en',
      name: props.name,
      theme: 'light',
      viewModeEnabled: false,
      initialData: {
        ...scene.value,
        scrollToContent: true,
      },
      excalidrawAPI: (api) => (excalidrawAPI.value = api),
      onLinkOpen: (element, event) => {
        // TODO
        event.preventDefault();
      },
      onLibraryChange: () => {
        // TODO
      },
      onChange: debounce(
        (elements: readonly OrderedExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
          // TODO(zjkmxy): Also listen to appstate and files.
          onEditorChange(elements, appState, files);
        },
        250,
      ),
    }),
  );
};

const destroy = () => {
  if (root) {
    root.unmount();
  }
  props.yjson.unobserve(observer);
};

watch(
  () => props.yjson,
  () => {
    destroy();
    create();
  },
);
onMounted(create);
onBeforeUnmount(destroy);
</script>

<style scoped lang="scss">
.excalidraw-wrapper {
  width: 100%;
  height: 100%;
}
</style>
