<template>
  <ModalComponent :show="show" @close="emit('close')">
    <div class="title is-5 mb-4">Share your Identity</div>

    <p>
      To join a workspace, share this QR code or the NDN name identifier below with the workspace
      owner, so that they can invite you!
    </p>

    <p class="my-1">
      <code class="select-all">{{ name }}</code>
    </p>

    <img class="qr" v-if="qrimg" :src="qrimg" />

    <div class="field has-text-right">
      <div class="control">
        <button class="button mr-2" @click="emit('close')">Close</button>
      </div>
    </div>
  </ModalComponent>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

import QRCode from 'qrcode';

import ModalComponent from '@/components/ModalComponent.vue';

const props = defineProps({
  show: {
    type: Boolean,
    required: true,
  },
});

const emit = defineEmits(['close']);
const name = ref(String());
const qrimg = ref(String());

watch(
  () => props.show,
  (show) => show && create(),
);

async function create() {
  name.value = await ndn_api.get_identity_name();

  const url = new URL(window.location.origin);
  url.searchParams.set('invite', name.value);

  qrimg.value = await QRCode.toDataURL(url.toString(), { scale: 6 });
}
</script>

<style scoped lang="scss">
img.qr {
  display: block;
  margin: 10px auto;
}
</style>
