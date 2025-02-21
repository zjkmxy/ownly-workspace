<template>
  <div class="outer">
    <LoadingSpinner v-if="loading" class="absolute-center" text="Loading your file ..." />

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
          :basename="resultPdfName"
          :pdf="resultPdf"
          :hasCompile="true"
          :compiling="isPdfCompiling"
          :error="resultError"
          @compile="compileLatex"
        />
      </div>

      <template #fallback>
        <LoadingSpinner class="absolute-center" text="Loading code editor ..." />
      </template>
    </Suspense>

    <Suspense v-else-if="contentMilk">
      <MilkdownEditor :yxml="contentMilk" :awareness="awareness!" />

      <template #fallback>
        <LoadingSpinner class="absolute-center" text="Loading document editor ..." />
      </template>
    </Suspense>

    <BlobView
      v-else-if="contentBlob"
      :key="filepath"
      :version="contentBlob"
      :path="filepath"
      :basename="basename"
    />
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
import BlobView from '@/components/files/BlobView.vue';

import * as latex from '@/services/latex/index';
import * as utils from '@/utils';
import { Workspace } from '@/services/workspace';

import type { WorkspaceProj } from '@/services/workspace-proj';
import type { IBlobVersion } from '@/services/types';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const loading = ref(true);
const filename = computed(() => route.params.filename as string[]);
const filepath = computed(() => '/' + filename.value.join('/'));
const basename = computed(() => filename.value[filename.value.length - 1]);

const proj = shallowRef(null as WorkspaceProj | null);

const contentDoc = shallowRef<Y.Doc | null>(null);
const awareness = shallowRef<awareProto.Awareness | null>(null);

const contentCode = shallowRef<Y.Text | null>(null);
const contentMilk = shallowRef<Y.XmlFragment | null>(null);
const contentBlob = shallowRef<IBlobVersion | null>(null);

const isLatex = ref<boolean>(false); // ref to prevent ui glitch
const resultPdfName = computed(() => `${proj.value?.name}.pdf`);
const resultPdf = shallowRef<Uint8Array | null>(null);
const isPdfCompiling = ref(false);
const resultError = ref(String());

onMounted(create);
watch(filename, create);
watch(() => route.params.project, create);
onBeforeUnmount(destroy);

async function create() {
  // If something fails, we should destroy these
  let newDoc: Y.Doc | null = null;
  let newAwareness: awareProto.Awareness | null = null;
  let newContentCode: Y.Text | null = null;
  let newContentMilk: Y.XmlFragment | null = null;
  let newContentBlob: IBlobVersion | null = null;

  // Always get rid of the blob when switching, otherwise it will
  // flicker due to a change in basename
  contentBlob.value = null;

  try {
    loading.value = true;

    const newProj = await Workspace.setupAndGetActiveProj(router);
    if (proj.value?.name !== newProj.name) await destroy();
    proj.value = newProj;

    // Load file metadata
    const metadata = proj.value.getFileMeta(filepath.value);
    if (!metadata) throw new Error(`File not found: ${filepath.value}`);

    // Load file content
    if (metadata.is_blob) {
      // Blob file, the doc contains the version list
      newDoc = await proj.value.getFile(filepath.value);
      newContentBlob = newDoc.getArray<IBlobVersion>('blobs').get(0);
      if (!newContentBlob) toast.warning('Empty blob file opened');
    } else if (utils.isExtensionType(basename.value, 'code')) {
      // Text file content
      newDoc = await proj.value.getFile(filepath.value);
      newAwareness = await proj.value.getAwareness(filepath.value);
      newContentCode = newDoc.getText('text');
    } else if (utils.isExtensionType(basename.value, 'milkdown')) {
      // Milkdown XML fragment content
      newDoc = await proj.value.getFile(filepath.value);
      newAwareness = await proj.value.getAwareness(filepath.value);
      newContentMilk = newDoc.getXmlFragment('milkdown');
    } else {
      throw new Error(`Unsupported content extension: ${basename.value}`);
    }

    // If the content doc is the same, then do not reset the doc
    // The provider returns the same doc if the file is already loaded
    // This will change if we support multiple open handles (e.g. ref counting)
    //
    // Test in case: rename an open file and open it - the path changes but
    // the underlying document is the same
    if (contentDoc.value?.guid === newDoc.guid) return;

    // Do the reset synchronously so that the UI does not refresh
    // This means that there will be no flicker and the PDF will stay.
    resetDoc();
    contentDoc.value = newDoc;
    awareness.value = newAwareness;
    contentCode.value = newContentCode;
    contentMilk.value = newContentMilk;
    contentBlob.value = newContentBlob;
    isLatex.value = utils.isExtensionType(basename.value, 'latex');
  } catch (err) {
    console.error(err);
    toast.error(`Failed to load file: ${err}`);

    // Destroy the new doc if it was created
    // This automatically destroys the children
    newDoc?.destroy();
  } finally {
    loading.value = false;
  }
}

function resetDoc() {
  contentCode.value = null;
  contentMilk.value = null;
  contentBlob.value = null;
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

  .editor {
    width: 100%;
  }
  &:has(.result) > .editor {
    width: 50%;
  }
  > .result {
    width: calc(100% - 50%);
  }
}
</style>
