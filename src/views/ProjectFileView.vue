<template>
  <div class="outer">
    <div class="absolute-center" v-if="loading">
      <LoadingSpinner />
      Loading your file ...
    </div>

    <Suspense v-if="contentCode">
      <div class="code">
        <CodeEditor
          class="editor"
          :ytext="contentCode"
          :basename="basename"
          :awareness="awareness!"
        />
        <PdfViewer
          class="result"
          v-if="isLatex"
          :filename="resultPdfName"
          :pdf="resultPdf"
          :hasCompile="true"
          :compiling="isPdfCompiling"
          :error="resultError"
          @compile="compileLatex"
        />
      </div>

      <template #fallback>
        <div class="absolute-center">
          <LoadingSpinner />
          Loading code editor ...
        </div>
      </template>
    </Suspense>

    <MilkdownEditor v-else-if="contentMilk" :yxml="contentMilk" :awareness="awareness!" />
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

import LoadingSpinner from '@/components/LoadingSpinner.vue';
const CodeEditor = defineAsyncComponent({
  loader: () => import('@/components/files/CodeEditor.vue'),
  loadingComponent: LoadingSpinner,
});
const MilkdownEditor = defineAsyncComponent({
  loader: () => import('@/components/files/MilkdownEditor.vue'),
  loadingComponent: LoadingSpinner,
});
const PdfViewer = defineAsyncComponent({
  loader: () => import('@/components/files/PdfViewer.vue'),
  loadingComponent: LoadingSpinner,
});

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

const isLatex = ref<boolean>(false); // ref to prevent ui glitch
const resultPdfName = computed(() => `${proj.value?.name}.pdf`);
const resultPdf = shallowRef<Uint8Array | null>(null);
const isPdfCompiling = ref(false);
const resultError = ref(String());

onMounted(create);
watch(filename, create);
watch(projName, create);
onBeforeUnmount(destroy);

async function create() {
  try {
    loading.value = true;

    if (proj.value?.name !== projName.value) {
      await destroy();

      // Load workspace
      const wksp = await Workspace.setupOrRedir(router);
      if (!wksp) return;

      // Load project
      proj.value = await wksp.proj.get(projName.value);
      if (!proj.value) return;
      await proj.value.activate();
    }

    // Load file content
    let newDoc: Y.Doc | null = null;
    let newAwareness: awareProto.Awareness | null = null;
    let newContentCode: Y.Text | null = null;
    let newContentMilk: Y.XmlFragment | null = null;

    if (utils.isExtensionType(basename.value, 'code')) {
      // Text file (show as code)
      newDoc = await proj.value.getFile(filepath.value);
      newAwareness = await proj.value.getAwareness(filepath.value);
      newContentCode = newDoc.getText('text');
    } else if (utils.isExtensionType(basename.value, 'milkdown')) {
      // Milkdown XML fragment
      newDoc = await proj.value.getFile(filepath.value);
      newAwareness = await proj.value.getAwareness(filepath.value);
      newContentMilk = newDoc.getXmlFragment('milkdown');
    } else {
      // Unsupported file type
      throw new Error(`Unsupported content extension: ${basename.value}`);
    }

    // Do the reset synchronously so that the UI does not refresh
    // This means that there will be no flicker and the PDF will stay.
    resetDoc();
    contentDoc.value = newDoc;
    awareness.value = newAwareness;
    contentCode.value = newContentCode;
    contentMilk.value = newContentMilk;
    isLatex.value = utils.isExtensionType(basename.value, 'latex');
  } catch (err) {
    console.error(err);
    toast.error(`Failed to load file: ${err}`);
  } finally {
    loading.value = false;
  }
}

function resetDoc() {
  contentCode.value = null;
  contentMilk.value = null;
  awareness.value = null;

  contentDoc.value?.destroy();
  contentDoc.value = null;
}

async function destroy() {
  resetDoc();
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
.outer {
  position: relative;
  height: 100%;
  width: 100%;
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
