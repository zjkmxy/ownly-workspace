<template>
  <div class="pdfviewer" ref="pdfviewer">
    <div class="pdf-toolbar">
      <div class="left">
        <button @click="$emit('compile')" class="button is-primary is-small soft-if-dark">
          Compile
        </button>
        <button class="button is-small soft-if-dark ml-1">Download</button>
      </div>
      <div class="right">
        <button
          class="button is-small soft-if-dark"
          @click="width = Math.max(width - 100, 200)"
          :disabled="!loaded || width <= 200"
        >
          <FontAwesomeIcon :icon="faMinus" />
        </button>
        <button
          class="button is-small soft-if-dark ml-1"
          @click="width = Math.min(width + 100, 5000)"
          :disabled="!loaded || width >= 5000"
        >
          <FontAwesomeIcon :icon="faPlus" />
        </button>
      </div>
    </div>

    <div class="pdf-content center-spinner" v-if="pdf && width">
      <Spinner v-if="!loaded" />
      <VuePdfEmbed
        annotation-layer
        text-layer
        :source="pdf"
        :width="width"
        @loaded="loaded = true"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, onMounted, ref, watch } from 'vue';

import Spinner from '@/components/Spinner.vue';
const VuePdfEmbed = defineAsyncComponent({
  loader: () => import('vue-pdf-embed'),
  loadingComponent: Spinner,
});

import 'vue-pdf-embed/dist/styles/annotationLayer.css';
import 'vue-pdf-embed/dist/styles/textLayer.css';

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';

defineEmits(['compile']);

const props = defineProps({
  pdf: {
    type: [Uint8Array, String, null],
    required: false,
  },
});

const pdfviewer = ref<InstanceType<typeof HTMLDivElement> | null>(null);
const width = ref(0);
const loaded = ref(false);

watch(
  () => props.pdf,
  () => {
    loaded.value = false;
  },
);

onMounted(() => {
  width.value = (pdfviewer.value?.clientWidth ?? 800) - 20;
});
</script>

<style lang="scss">
// https://github.com/wojtekmaj/react-pdf/issues/1815
.hiddenCanvasElement {
  display: none;
}
</style>

<style scoped lang="scss">
.pdfviewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bulma-scheme-main-bis);
  overflow: hidden;
  padding-left: 4px;

  .pdf-toolbar {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    padding-right: 4px;
    width: 100%;
    > .left {
      flex: 1;
      display: flex;
      justify-content: flex-start;
    }
    > .right {
      flex: 1;
      display: flex;
      justify-content: flex-end;
    }
  }

  > .pdf-content {
    position: relative;
    overflow-y: hidden;
    overflow-x: auto;
    flex: 1;
    text-align: center;

    :deep(.vue-pdf-embed) {
      overflow-y: scroll;
      display: inline-block;
      height: 100%;

      .vue-pdf-embed__page {
        margin-bottom: 10px;
      }
    }
  }
}
</style>
