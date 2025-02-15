<template>
  <button
    ref="button"
    class="button"
    @click.stop.prevent="$refs.dropdown!.open($event)"
    title="Update contents of this node"
  >
    <FontAwesomeIcon class="mr-1" :icon="faCaretDown" size="2xs" />

    <Dropdown ref="dropdown">
      <a class="dropdown-item" v-if="allowNew" @click="emit('new-folder')"> New folder </a>
      <a class="dropdown-item" v-if="allowNew" @click="emit('new-file')"> New blank file </a>
      <hr class="dropdown-divider" v-if="allowNew && allowDelete" />
      <a class="dropdown-item" v-if="allowDelete" @click="emit('delete')"> Delete </a>
    </Dropdown>
  </button>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faCaretDown } from '@fortawesome/free-solid-svg-icons';
import Dropdown from './Dropdown.vue';

defineProps({
  allowNew: Boolean,
  allowDelete: Boolean,
});

const emit = defineEmits(['new-folder', 'new-file', 'delete']);

const button = ref<HTMLElement | null>(null);
const dropdown = ref<InstanceType<typeof Dropdown> | null>(null);

// This is a bit ugly, but simplifies the parent component
// Attach to the parent's context menu event here and trigger the dropdown
onMounted(() => {
  button.value?.parentElement?.addEventListener('contextmenu', dropdown.value!.open);
});

onBeforeUnmount(() => {
  button.value?.parentElement?.removeEventListener('contextmenu', dropdown.value!.open);
});
</script>

<style lang="css" scoped></style>
