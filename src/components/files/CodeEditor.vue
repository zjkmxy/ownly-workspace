<template>
  <div ref="container" class="container"></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, type PropType } from 'vue';

import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import type { Awareness } from 'y-protocols/awareness.js';

import * as utils from '@/utils';
import { monacoRegister } from '@/utils/monaco';

// @ts-ignore
self.MonacoEnvironment = {
  getWorker(_: any, label: string) {
    if (label === 'json') return new jsonWorker();
    return new editorWorker();
  },
};

const props = defineProps({
  ytext: {
    type: Object as PropType<Y.Text>,
    required: true,
  },
  awareness: {
    type: Object as PropType<Awareness>,
    required: true,
  },
  basename: {
    type: String,
    required: true,
  },
});

const container = ref<InstanceType<typeof HTMLDivElement> | null>(null);

let editor: monaco.editor.IStandaloneCodeEditor | null = null;
let ybinding: MonacoBinding | null = null;

onMounted(() => {
  monacoRegister();

  const ext = props.basename.split('.').pop()?.toLocaleLowerCase();
  let language = 'plaintext';
  switch (ext) {
    case 'md':
      language = 'markdown';
      break;
    case 'json':
      language = 'json';
      break;
    case 'tex':
    case 'latex':
    case 'sty':
    case 'cls':
      language = 'latex';
      break;
    case 'bib':
      language = 'bibtex';
      break;
  }

  editor = monaco.editor.create(container.value!, {
    value: String(),
    language: language,
    theme: utils.themeIsDark() ? 'vs-dark' : 'vs',
    automaticLayout: true,
    scrollBeyondLastLine: false,
    minimap: { enabled: false },
    suggest: { showWords: false },
    wordWrap: 'on',
    padding: { top: 20, bottom: 10 },
  });

  ybinding = new MonacoBinding(
    props.ytext,
    editor!.getModel()!,
    new Set([editor]),
    props.awareness,
  );
});

onBeforeUnmount(() => {
  ybinding?.destroy();
  editor?.getModel()?.dispose();
  editor?.dispose();
});
</script>

<style scoped lang="scss">
.container {
  height: 100%;
}
</style>

<style lang="scss">
:root {
  --default-y-selection-color: 255, 165, 0;
}
.yRemoteSelection {
  background-color: rgba(var(--default-y-selection-color), 0.4);
}
.yRemoteSelectionHead {
  position: absolute;
  border-left: 2px solid black;
  border-color: rgb(var(--default-y-selection-color));
  height: 100%;
  transition: opacity 0.1s ease;
}
.yRemoteSelectionHead::after {
  position: absolute;
  content: '';
  background-color: rgb(var(--default-y-selection-color));
  transform: translateY(-100%) translateX(-2px);
  border-radius: 3px;
  padding: 0 3px;
  font-size: 10pt;
  color: var(--bulma-text-strong);
  animation: fade90 2s forwards;
}
</style>
