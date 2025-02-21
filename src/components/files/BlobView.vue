<template>
  <div class="blob-view">
    <div v-if="previewLoading" class="absolute-center">
      <LoadingSpinner />
      Loading preview ...
    </div>

    <img v-else-if="previewImage" class="img-preview" :alt="basename" :src="previewImage" />
    <PdfViewer v-else-if="previewPdf" :basename="basename" :pdf="previewPdf" />

    <div v-else class="card no-preview">
      <div class="card-content">
        <div class="media">
          <div class="media-content">
            <p class="subtitle is-5">{{ basename }}</p>
            <FontAwesomeIcon :icon="faFile" size="4x" />
          </div>
        </div>

        <div class="content">
          {{ utils.humanFileSize(version.size) }}
          <br />
          No preview available
          <br />
          <a href="#" @click.prevent="exportFile">Export File</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, onMounted, onUnmounted, ref, shallowRef } from 'vue';
import { useToast } from 'vue-toast-notification';
import { useRouter } from 'vue-router';

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faFile } from '@fortawesome/free-solid-svg-icons';

import LoadingSpinner from '@/components/LoadingSpinner.vue';
const PdfViewer = defineAsyncComponent({
  loader: () => import('@/components/files/PdfViewer.vue'),
  loadingComponent: LoadingSpinner,
});

import { Workspace } from '@/services/workspace';
import * as opfs from '@/services/opfs';
import * as utils from '@/utils';

import type { IBlobVersion } from '@/services/types';

const toast = useToast();
const router = useRouter();

const previewLoading = ref(false);
const previewImage = ref<string | null>(null);
const previewPdf = shallowRef<Uint8Array | null>(null);

const props = defineProps<{
  version: IBlobVersion;
  path: string;
  basename: string;
}>();

onMounted(async () => {
  try {
    previewLoading.value = true;

    const isImage = utils.isExtensionType(props.path, 'image');
    const isPdf = utils.isExtensionType(props.path, 'pdf');

    // Load the file into the OPFS
    if (isImage || isPdf) {
      const proj = await Workspace.setupAndGetActiveProj(router);
      const path = await proj.syncFs(props.path);
      const handle = await opfs.getFileHandle(path);
      const file = await handle.getFile();

      if (isImage) {
        previewImage.value = URL.createObjectURL(file);
      }
      if (isPdf) {
        const buf = await file.arrayBuffer();
        previewPdf.value = new Uint8Array(buf);
      }
    }
  } catch (err) {
    console.warn(`Error loading preview for ${props.path}`, err);
  } finally {
    previewLoading.value = false;
  }
});

onUnmounted(() => {
  if (previewImage.value) {
    URL.revokeObjectURL(previewImage.value);
  }
});

async function exportFile() {
  try {
    const proj = await Workspace.setupAndGetActiveProj(router);
    await proj.download(props.path);
  } catch (err) {
    console.error(err);
    toast.error(`Error exporting ${props.path}: ${err}`);
  }
}
</script>

<style scoped lang="scss">
.blob-view {
  height: 100%;
  overflow: hidden;
  position: relative;
  display: block;

  img.img-preview {
    padding: 10px;
    position: relative;
    display: block;
    max-width: 100%;
    max-height: 100%;
    top: 50%;
    transform: translateY(-50%);
    object-fit: contain;
    margin: 0 auto;
  }

  .no-preview {
    text-align: center;
    position: relative;
    max-width: 400px;
    margin: 100px auto;
  }
}
</style>
