<template>
  <div>Hello World</div>
</template>

<script setup lang="ts">
import * as utils from '@/utils/index'

async function setup() {
  const wksp = await utils.getWorkspaceOrRedirect()
  if (!wksp) return // redirects
}

setup()
</script>

<style scoped lang="scss"></style>
