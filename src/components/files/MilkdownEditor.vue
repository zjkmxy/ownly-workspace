<template>
  <div ref="outer" class="outer"></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch, type PropType } from 'vue';

import * as Y from 'yjs';
import type { Awareness } from 'y-protocols/awareness.js';

import { Crepe } from '@milkdown/crepe';
import { collab, CollabService, collabServiceCtx } from '@milkdown/plugin-collab';
import '@milkdown/crepe/theme/common/style.css';

import * as utils from '@/utils';

const props = defineProps({
  yxml: {
    type: Object as PropType<Y.XmlFragment>,
    required: true,
  },
  awareness: {
    type: Object as PropType<Awareness>,
    required: true,
  },
});

const outer = ref<InstanceType<typeof HTMLDivElement> | null>(null);

let crepe: Crepe | null = null;
let collabService: CollabService | null = null;

watch(
  () => props.yxml,
  async () => {
    await destroy();
    await create();
  },
);
onMounted(create);
onBeforeUnmount(destroy);

async function create() {
  if (utils.themeIsDark()) {
    await import('@milkdown/crepe/theme/frame-dark.css');
  } else {
    await import('@milkdown/crepe/theme/frame.css');
  }

  crepe = new Crepe({
    root: outer.value!,
  });
  crepe.editor.use(collab);
  await crepe.create();

  crepe.editor.action((ctx) => {
    collabService = ctx.get(collabServiceCtx);
    collabService.bindXmlFragment(props.yxml).setAwareness(props.awareness).connect();
  });
}

async function destroy() {
  collabService?.disconnect();
  await crepe?.destroy();
}
</script>

<style scoped lang="scss">
.outer :deep(.milkdown) {
  height: 100vh;
  overflow-y: scroll;
  overflow-x: hidden;
}
</style>

<style lang="scss">
// Fix overlap with side panel
milkdown-toolbar {
  z-index: 1000;
}

// Taken from the example at https://milkdown.dev/docs/guide/collaborative-editing
.ProseMirror > .ProseMirror-yjs-cursor:first-child {
  margin-top: 16px;
}
.ProseMirror p:first-child,
.ProseMirror h1:first-child,
.ProseMirror h2:first-child,
.ProseMirror h3:first-child,
.ProseMirror h4:first-child,
.ProseMirror h5:first-child,
.ProseMirror h6:first-child {
  margin-top: 16px;
}

.ProseMirror-yjs-cursor {
  position: absolute;
  border-left: 2px solid black;
  border-color: orange;
  word-break: normal;
  pointer-events: none;
}

.ProseMirror-yjs-cursor > div {
  position: absolute;
  top: -1em;
  left: -2px;
  font-size: 10pt;
  background-color: orange;
  border-radius: 2px;
  border-radius: 3px;
  padding: 1px 3px;
  font-style: normal;
  font-weight: normal;
  line-height: normal;
  user-select: none;
  color: black;
  white-space: nowrap;
  animation: fade90 2s forwards;
}
</style>
