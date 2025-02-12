<template>
  <div>Hello World</div>
</template>

<script setup lang="ts">
import * as workspace from '@/services/workspace'
import { ref } from 'vue'

const wksp = ref(null as workspace.Workspace | null)

async function setup() {
  wksp.value = await workspace.setupOrRedir()
  if (!wksp.value) return
}

setup()
</script>

<style scoped lang="scss"></style>
