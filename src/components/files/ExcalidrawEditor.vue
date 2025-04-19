<template>
  <iframe class="outer" :srcdoc="srcDoc"></iframe>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, type PropType, ref, watch, nextTick } from 'vue';
import { useBroadcastChannel, pausableWatch } from '@vueuse/core';

import * as Y from 'yjs';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { ExcalidrawConfig, ExcalidrawMessage } from '../../services/excalidraw-types';
import type { ImportedDataState } from '@excalidraw/excalidraw/data/types';
import { bytesToBase64, numberArrayToText, textToNumberArray } from '../../utils/base64';
import srcDocText from '@/../public/excalidraw/index.html?raw';

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

const { data /* post */ } = useBroadcastChannel({ name: 'excalidraw' });
const srcDoc = ref('');
// TODO(zjkmxy): Make these files managed by Yjs.
const scene = ref<ImportedDataState>({
  elements: [],
  type: 'excalidraw',
  version: 2,
  source: 'https://ownly.work/',
  appState: {
    gridSize: 20,
    gridStep: 5,
    gridModeEnabled: false,
    viewBackgroundColor: '#ffffff',
  },
  files: {},
});

const convertYjsToFile = (yjson: Y.Map<ExcalidrawElement>): ImportedDataState => {
  return {
    elements: Array.from(yjson.values()),
    type: 'excalidraw',
    version: 2,
    source: 'https://ownly.work/',
    appState: {
      gridSize: 20,
      gridStep: 5,
      gridModeEnabled: false,
      viewBackgroundColor: '#ffffff',
    },
    files: {},
  };
};

const sceneUpdateWatcher = pausableWatch(scene, () => {
  const config: ExcalidrawConfig = {
    content: textToNumberArray(JSON.stringify(scene.value)),
    contentType: 'application/json',
    library: '',
    viewModeEnabled: false,
    theme: 'light',
    imageParams: {
      exportScale: 1,
      exportBackground: true,
      exportWithDarkMode: false,
    },
    langCode: 'en',
    name: props.name,
  };
  srcDoc.value = srcDocText
    .replace(
      '{{data-excalidraw-config}}',
      bytesToBase64(new TextEncoder().encode(JSON.stringify(config))),
    )
    .replaceAll('/static/', '/excalidraw/static/');
});

const compareAndUpdateYMap = (newScene: ImportedDataState, yjson: Y.Map<ExcalidrawElement>) => {
  const newMap = new Map((newScene.elements ?? []).map((ele) => [ele.id, ele]));
  Y.transact(
    yjson.doc!,
    () => {
      // console.log('Transacted')
      for (const [id, ele] of newMap) {
        if (!yjson.has(id)) {
          // New item
          yjson.set(id, ele);
          continue;
        }
        const oldEle = yjson.get(id);
        if (oldEle !== ele) {
          // Modified item
          // Since we do not have finer granularity for now, update the whole element.
          yjson.set(id, ele);
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

watch(data, () => {
  if (data.value) {
    const message = data.value as ExcalidrawMessage;
    if (message.type === 'change') {
      const newDocFile = JSON.parse(numberArrayToText(message.content)) as ImportedDataState;
      // console.log(newDocFile);

      // Update from the editor-side does not trigger reload
      sceneUpdateWatcher.pause();
      compareAndUpdateYMap(newDocFile, props.yjson);
      scene.value = newDocFile;
      nextTick().then(() => sceneUpdateWatcher.resume());
    }
  }
});

const observer = (event: Y.YMapEvent<ExcalidrawElement>) => {
  if (event.transaction.origin === 'excalidraw' || event.transaction.local) {
    // Ignore local changes; do not reload
    return;
  }
  scene.value = convertYjsToFile(props.yjson);
};

const create = () => {
  scene.value = convertYjsToFile(props.yjson);
  props.yjson.observe(observer);
};

const destroy = () => {
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
.outer {
  height: 100%;
  width: 100%;
}
</style>
