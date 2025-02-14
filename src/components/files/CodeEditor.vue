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

import { monacoRegister } from '@/utils';

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
    required: false,
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
    automaticLayout: true,
    scrollBeyondLastLine: false,
    minimap: { enabled: false },
    suggest: { showWords: false },
    wordWrap: 'on',
  });

  if (props.ytext) {
    ybinding = new MonacoBinding(props.ytext, editor!.getModel()!);
  }
});

onBeforeUnmount(() => {
  ybinding?.destroy();
  editor?.getModel()?.dispose();
  editor?.dispose();
});
</script>

<style scoped lang="scss">
.container {
  height: 100vh;
}
</style>
