<template>
  <div ref="container" class="container"></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, type PropType } from 'vue';

import * as Y from 'yjs';

import { Crepe } from '@milkdown/crepe';
import { collab, CollabService, collabServiceCtx } from '@milkdown/plugin-collab';
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/nord.css';

const props = defineProps({
  yxml: {
    type: Object as PropType<Y.XmlFragment>,
    required: true,
  },
});

const container = ref<InstanceType<typeof HTMLDivElement> | null>(null);

let crepe: Crepe | null = null;
let collabService: CollabService | null = null;

onMounted(async () => {
  crepe = new Crepe({
    root: container.value!,
  });
  crepe.editor.use(collab);
  await crepe.create();

  crepe.editor.action((ctx) => {
    collabService = ctx.get(collabServiceCtx);
    collabService.bindXmlFragment(props.yxml).connect();
  });
});

onBeforeUnmount(() => {
  collabService?.disconnect();
  crepe?.destroy();
});
</script>

<style scoped lang="scss">
.container :deep(.milkdown) {
  height: 100vh;
  overflow-y: scroll;
}
</style>

<style lang="scss">
// Fix overlap with side panel
milkdown-toolbar {
  z-index: 1000;
}
</style>
