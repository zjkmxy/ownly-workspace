<template>
  <div class="absolute-center" v-if="loading">
    <Spinner />
    Loading your messages ...
  </div>
  <div v-else-if="contentCode" class="center-spinner">
    <CodeEditor :ytext="contentCode" :key="filepath" :basename="basename" :awareness="awareness!" />
  </div>
  <div v-else-if="contentMilk" class="center-spinner">
    <MilkdownEditor :yxml="contentMilk" :awareness="awareness!" />
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
} from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'vue-toast-notification';

import * as Y from 'yjs';
import * as awareProto from 'y-protocols/awareness.js';

import Spinner from '@/components/Spinner.vue';
const CodeEditor = defineAsyncComponent({
  loader: () => import('@/components/files/CodeEditor.vue'),
  loadingComponent: Spinner,
});
const MilkdownEditor = defineAsyncComponent({
  loader: () => import('@/components/files/MilkdownEditor.vue'),
  loadingComponent: Spinner,
});

import { Workspace } from '@/services/workspace';
import type { WorkspaceProj } from '@/services/workspace-proj';

import EXT_CODE from './extensions_code.json';
const EXT_MILKDOWN = ['mdoc'];

const route = useRoute();
const toast = useToast();

const loading = ref(true);
const projName = computed(() => route.params.project as string);
const filename = computed(() => route.params.filename as string[]);
const filepath = computed(() => '/' + filename.value.join('/'));
const basename = computed(() => filename.value[filename.value.length - 1]);

const proj = shallowRef(null as WorkspaceProj | null);

const contentDoc = shallowRef<Y.Doc | null>(null);
const awareness = shallowRef<awareProto.Awareness | null>(null);

const contentCode = shallowRef<Y.Text | null>(null);
const contentMilk = shallowRef<Y.XmlFragment | null>(null);

onMounted(create);
watch(filename, create);
watch(projName, create);
onBeforeUnmount(destroy);

async function create() {
  try {
    loading.value = true;
    await destroy();

    // Load workspace
    const wksp = await Workspace.setupOrRedir();
    if (!wksp) return;

    // Load project
    proj.value = await wksp.proj.get(projName.value);
    if (!proj.value) return;
    await proj.value.activate();

    // Load file content
    contentDoc.value = await proj.value.getFile(filepath.value);
    const extension = basename.value.split('.').pop() ?? '';

    if (EXT_CODE.includes(extension)) {
      awareness.value = await proj.value.getAwareness(filepath.value);
      contentCode.value = contentDoc.value.getText('text');
    } else if (EXT_MILKDOWN.includes(extension)) {
      awareness.value = await proj.value.getAwareness(filepath.value);
      contentMilk.value = contentDoc.value.getXmlFragment('milkdown');
    } else {
      throw new Error(`Unsupported content extension: ${extension}`);
    }
  } catch (err) {
    console.error(err);
    toast.error(`Failed to load file: ${err}`);
  } finally {
    loading.value = false;
  }
}

async function destroy() {
  contentCode.value = null;
  contentMilk.value = null;
  awareness.value = null;

  contentDoc.value?.destroy();
  contentDoc.value = null;
}
</script>

<style scoped lang="scss"></style>
