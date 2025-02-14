<template>
  <button class="button" @click.stop.prevent="$emit('add')" title="Update contents of this node">
    <FontAwesomeIcon class="mr-1" :icon="fas.faCaretDown" size="2xs" />
  </button>
</template>

<script setup lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
</script>

<style lang="css" scoped></style>
