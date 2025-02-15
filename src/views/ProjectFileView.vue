<template>
  <div class="fixed-center" v-if="loading">
    <Spinner />
    Loading your messages ...
  </div>
  <div v-else-if="contentText">
    <CodeEditor
      :ytext="contentText"
      :key="filepath"
      :basename="basename"
      :awareness="proj!.awareness"
    />
  </div>
  <div v-else-if="contentXml">
    <MilkdownEditor :yxml="contentXml" :awareness="proj!.awareness" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'vue-toast-notification';

import * as Y from 'yjs';

import Spinner from '@/components/Spinner.vue';
import CodeEditor from '@/components/files/CodeEditor.vue';
import MilkdownEditor from '@/components/files/MilkdownEditor.vue';

import { Workspace } from '@/services/workspace';
import type { WorkspaceProj } from '@/services/workspace-proj';

const route = useRoute();
const toast = useToast();

const loading = ref(true);
const projName = computed(() => route.params.project as string);
const filename = computed(() => route.params.filename as string[]);
const filepath = computed(() => '/' + filename.value.join('/'));
const basename = computed(() => filename.value[filename.value.length - 1]);

const proj = shallowRef(null as WorkspaceProj | null);
const contentText = shallowRef<Y.Text | null>(null);
const contentXml = shallowRef<Y.XmlFragment | null>(null);

onMounted(setup);
watch(filename, setup);
watch(projName, setup);

async function setup() {
  try {
    loading.value = true;
    contentText.value = null;
    contentXml.value = null;

    // Load workspace
    const wksp = await Workspace.setupOrRedir();
    if (!wksp) return;

    // Load project
    proj.value = await wksp.proj.get(projName.value);
    if (!proj.value) return;
    await proj.value.activate();

    // Load file content
    const content = await proj.value.getContent(filepath.value);
    if (content instanceof Y.Text) {
      contentText.value = content;
    } else if (content instanceof Y.XmlFragment) {
      contentXml.value = content;
    } else {
      throw new Error(`Unsupported content type: ${content}`);
    }
  } catch (err) {
    console.error(err);
    toast.error(`Failed to load project: ${err}`);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped lang="scss"></style>
