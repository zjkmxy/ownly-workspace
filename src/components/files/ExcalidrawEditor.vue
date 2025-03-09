<template>
  <iframe class="outer" :srcdoc="srcDoc"></iframe>
</template>

<script setup lang="ts">
import { onMounted, type PropType, ref, watch } from 'vue';

import * as Y from 'yjs';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { ExcalidrawConfig } from '../../services/excalidraw-types';
import type { ImportedDataState } from '@excalidraw/excalidraw/data/types';
import { bytesToBase64 } from '../../utils/base64';
import srcDocText from '@/../public/excalidraw/index.html?raw';
import { loadFromBlob } from '@excalidraw/excalidraw';

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

const convertYjsToFile = (yjson: Y.Map<ExcalidrawElement>): ImportedDataState => {
  // TODO(zjkmxy): Make these files managed by Yjs.
  return {
    // elements: Array.from(yjson.values()),
    elements: [
      {
        id: 'fsUqC6J2_3O0y5dKMfVk0',
        type: 'rectangle',
        x: 568.69921875,
        y: 247.44921875,
        width: 202.08984375,
        height: 187.42578125,
        angle: 0,
        strokeColor: '#1e1e1e',
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 2,
        strokeStyle: 'solid',
        roughness: 1,
        opacity: 100,
        groupIds: [],
        frameId: null,
        index: 'a0' as any,
        roundness: {
          type: 3,
        },
        seed: 1735938517,
        version: 38,
        versionNonce: 1601591643,
        isDeleted: false,
        boundElements: [
          {
            type: 'text',
            id: 'UpoNSAuoxhm1pcqIkklxP',
          },
        ],
        updated: 1741551086522,
        link: null,
        locked: false,
      },
      {
        id: 'UpoNSAuoxhm1pcqIkklxP',
        type: 'text',
        x: 635.2641754150391,
        y: 328.662109375,
        width: 68.95993041992188,
        height: 25,
        angle: 0,
        strokeColor: '#1e1e1e',
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 2,
        strokeStyle: 'solid',
        roughness: 1,
        opacity: 100,
        groupIds: [],
        frameId: null,
        index: 'a1' as any,
        roundness: null,
        seed: 393675445,
        version: 9,
        versionNonce: 263747067,
        isDeleted: false,
        boundElements: [],
        updated: 1741551086522,
        link: null,
        locked: false,
        text: 'asdsad',
        fontSize: 20,
        fontFamily: 5,
        textAlign: 'center',
        verticalAlign: 'middle',
        containerId: 'fsUqC6J2_3O0y5dKMfVk0',
        originalText: 'asdsad',
        autoResize: true,
        lineHeight: 1.25 as any,
      },
    ],
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

const srcDoc = ref('');

const textToNumberArray = (jsonText: string): Array<number> => {
  return Array.from(new TextEncoder().encode(jsonText));
}

const create = () => {
  const content = convertYjsToFile(props.yjson);
  loadFromBlob(new Blob([JSON.stringify(content)], { type: 'application/json' }), null, null).then((result) => {
    console.log(result);
  }).catch((err) => {
    console.log(err);
  })

  const config: ExcalidrawConfig = {
    content: textToNumberArray(JSON.stringify(convertYjsToFile(props.yjson))),
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
};

watch(() => props.yjson, create);
onMounted(create);
</script>

<style scoped lang="scss">
.outer {
  height: 100%;
  width: 100%;
}
</style>
