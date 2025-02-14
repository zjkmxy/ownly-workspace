<template>
  <button
    class="button"
    @click.stop.prevent="$refs.dd!.open($event)"
    title="Update contents of this node"
  >
    <FontAwesomeIcon class="mr-1" :icon="fas.faCaretDown" size="2xs" />

    <Dropdown ref="dd">
      <a class="dropdown-item" @click="emit('new-folder')"> New folder </a>
      <a class="dropdown-item" @click="emit('new-file')"> New blank file </a>
      <hr class="dropdown-divider" />
      <a class="dropdown-item" @click="emit('delete')"> Delete </a>
    </Dropdown>
  </button>
</template>

<script setup lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import Dropdown from './Dropdown.vue';

const emit = defineEmits(['new-folder', 'new-file', 'delete']);
</script>

<style lang="css" scoped></style>
