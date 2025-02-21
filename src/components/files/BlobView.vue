<template>
  <div class="blob-view">
    <div class="card">
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
import { useToast } from 'vue-toast-notification';
import { useRouter } from 'vue-router';

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faFile } from '@fortawesome/free-solid-svg-icons';

import { Workspace } from '@/services/workspace';
import * as utils from '@/utils';

import type { IBlobVersion } from '@/services/types';

const toast = useToast();
const router = useRouter();

const props = defineProps<{
  version: IBlobVersion;
  path: string;
  basename: string;
}>();

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

  .card {
    text-align: center;
    position: relative;
    max-width: 400px;
    margin: 100px auto;
  }
}
</style>
