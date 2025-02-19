<template>
  <div class="outer py-4">
    <div class="absolute-center" v-if="!wksp">
      <Spinner />
      Loading your workspace ...
    </div>

    <template v-else>
      <section class="hero project-ready">
        <div class="hero-body">
          <p class="title">
            <FontAwesomeIcon class="mr-1" :icon="faBriefcase" size="sm" />
            {{ wksp.metadata.label }}
          </p>
          <p class="subtitle mt-4">
            Your workspace is loaded! <br />
            Select or create a project from the sidebar to get started.
          </p>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, shallowRef } from 'vue';

import { faBriefcase } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

import Spinner from '@/components/Spinner.vue';

import { Workspace } from '@/services/workspace';

const wksp = shallowRef(null as Workspace | null);

onMounted(setup);

async function setup() {
  wksp.value = await Workspace.setupOrRedir();
  if (!wksp.value) return;
}
</script>

<style scoped lang="scss">
.outer {
  user-select: none;
}
.project-ready .subtitle {
  line-height: 1.8em;
}
</style>
