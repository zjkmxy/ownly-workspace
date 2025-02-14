<template>
  <div>
    Hello World
    {{ filename }}
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'vue-toast-notification';

import { Workspace } from '@/services/workspace';
import type { WorkspaceProj } from '@/services/workspace-proj';

const route = useRoute();
const toast = useToast();

const projName = computed(() => route.params.project as string);
const filename = computed(() => route.params.filename as string[]);

const proj = ref(null as WorkspaceProj | null);

onMounted(setup);
watch(filename, setup);
watch(projName, setup);

async function setup() {
  try {
    const wksp = await Workspace.setupOrRedir();
    if (!wksp) return;

    proj.value = await wksp.proj.get(projName.value);
    if (!proj.value) return;

    await proj.value.activate();
  } catch (err) {
    console.error(err);
    toast.error(`Failed to load project: ${err}`);
  }
}
</script>

<style scoped lang="scss"></style>
