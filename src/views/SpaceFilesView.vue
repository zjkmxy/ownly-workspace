<template>
  <div>Hello World</div>
</template>

<script setup lang="ts">
import { Workspace } from '@/services/workspace';
import { shallowRef } from 'vue';

const wksp = shallowRef(null as Workspace | null);

async function setup() {
  wksp.value = await Workspace.setupOrRedir();
  if (!wksp.value) return;
}

setup();
</script>

<style scoped lang="scss"></style>
