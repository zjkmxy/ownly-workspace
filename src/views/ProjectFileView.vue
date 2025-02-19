<template>
  <div class="container" v-if="loading">
    <div class="absolute-center">
      <Spinner />
      Loading your file ...
    </div>
  </div>

  <div v-else-if="contentCode" class="container center-spinner">
    <Suspense>
      <div class="code">
        <CodeEditor
          class="editor"
          :ytext="contentCode"
          :key="filepath"
          :basename="basename"
          :awareness="awareness!"
        />
        <PdfViewer
          class="result"
          v-if="isLatex"
          :pdf="resultPdf"
          @compile="compileLatex"
          :compiling="isPdfCompiling"
          :error="resultError"
        />
      </div>

      <template #fallback>
        <div class="absolute-center">
          <Spinner />
          Loading code editor ...
        </div>
      </template>
    </Suspense>
  </div>

  <div v-else-if="contentMilk" class="center-spinner">
    <MilkdownEditor :yxml="contentMilk" :awareness="awareness!" />
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toast-notification';

import * as Y from 'yjs';
import * as awareProto from 'y-protocols/awareness.js';

import Spinner from '@/components/Spinner.vue';
const CodeEditor = defineAsyncComponent({
  loader: () => import('@/components/files/CodeEditor.vue'),
  loadingComponent: Spinner,
});
const MilkdownEditor = defineAsyncComponent({
  loader: () => import('@/components/files/MilkdownEditor.vue'),
  loadingComponent: Spinner,
});

import PdfViewer from '@/components/files/PdfViewer.vue';

import { Workspace } from '@/services/workspace';
import type { WorkspaceProj } from '@/services/workspace-proj';
import * as latex from '@/services/latex/index';
import * as utils from '@/utils';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const loading = ref(true);
const projName = computed(() => route.params.project as string);
const filename = computed(() => route.params.filename as string[]);
const filepath = computed(() => '/' + filename.value.join('/'));
const basename = computed(() => filename.value[filename.value.length - 1]);

const proj = shallowRef(null as WorkspaceProj | null);

const contentDoc = shallowRef<Y.Doc | null>(null);
const awareness = shallowRef<awareProto.Awareness | null>(null);

const contentCode = shallowRef<Y.Text | null>(null);
const contentMilk = shallowRef<Y.XmlFragment | null>(null);

const isLatex = computed(() => utils.isExtensionType(basename.value, 'latex'));
const resultPdf = shallowRef<Uint8Array | string | null>(null);
const isPdfCompiling = ref(false);
const resultError = ref(String());

onMounted(create);
watch(filename, create);
watch(projName, create);
onBeforeUnmount(destroy);

async function create() {
  try {
    loading.value = true;
    await destroy();

    // Load workspace
    const wksp = await Workspace.setupOrRedir(router);
    if (!wksp) return;

    // Load project
    proj.value = await wksp.proj.get(projName.value);
    if (!proj.value) return;
    await proj.value.activate();

    // Load file content
    contentDoc.value = await proj.value.getFile(filepath.value);

    if (utils.isExtensionType(basename.value, 'code')) {
      awareness.value = await proj.value.getAwareness(filepath.value);
      contentCode.value = contentDoc.value.getText('text');
    } else if (utils.isExtensionType(basename.value, 'milkdown')) {
      awareness.value = await proj.value.getAwareness(filepath.value);
      contentMilk.value = contentDoc.value.getXmlFragment('milkdown');
    } else {
      throw new Error(`Unsupported content extension: ${basename.value}`);
    }
  } catch (err) {
    console.error(err);
    toast.error(`Failed to load file: ${err}`);
  } finally {
    loading.value = false;
  }
}

async function destroy() {
  contentCode.value = null;
  contentMilk.value = null;
  awareness.value = null;

  contentDoc.value?.destroy();
  contentDoc.value = null;

  isPdfCompiling.value = false;
  resultPdf.value = null;
  resultError.value = String();
}

async function compileLatex() {
  if (isPdfCompiling.value) return;
  try {
    isPdfCompiling.value = true;
    resultPdf.value = await latex.compile(proj.value!);
    resultError.value = String();
  } catch (err) {
    resultError.value = `Failed to compile LaTeX\n\n ${err}`;
  } finally {
    isPdfCompiling.value = false;
  }
}
</script>

<style scoped lang="scss">
.container {
  height: 100%;
}

.code {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: row;
  width: 100%;

  > .editor {
    flex: 1;
  }

  > .result {
    flex-basis: 50%;
  }
}
</style>
