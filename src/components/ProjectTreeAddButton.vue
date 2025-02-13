<template>
  <button class="button" @click.stop.prevent="$emit('add')" title="Add a new file or folder">
    <FontAwesomeIcon class="mr-1" :icon="fas.faPlus" size="2xs" />
  </button>
</template>

<script setup lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
</script>

<style lang="css" scoped></style>
