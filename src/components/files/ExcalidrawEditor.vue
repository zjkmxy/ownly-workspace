<template>
  <iframe :srcdoc=srcdoc></iframe>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue';

import * as Y from 'yjs';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'

const props = defineProps({
  yjson: {
    type: Object as PropType<Y.Map<ExcalidrawElement>>,
    required: true,
  },
});

const html = (strings: ArrayLike<string>, ...values: any[]) => String.raw({ raw: strings }, ...values);

const srcdoc = computed(() => {
  return html`<!doctype html><html lang="en">
  <head><meta charset="utf-8"/><title>Ownly Excalidraw</title>
  <style></style><script defer="defer" src="/static/js/main.d2a47c81.js">
  </script><link href="/static/css/main.11acca1e.css" rel="stylesheet"></head>
  <body><noscript>You need to enable JavaScript to run this app.</noscript>
  <div id="root" data-excalidraw-config="{{data-excalidraw-config}}"></div>
  <script>window.EXCALIDRAW_EXPORT_SOURCE="https://ownly.work/",window.EXCALIDRAW_ASSET_PATH="/excalidraw-assets"</script>
  </body></html>`;
})

</script>
