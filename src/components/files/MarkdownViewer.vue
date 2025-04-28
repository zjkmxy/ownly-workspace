<template>
  <div class="mdviewer" ref="mdviewer">
    <!-- PDF Viewer -->
    <div class="content" ref="mdcontent">
      <div v-html="mdHtml"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch, type PropType } from 'vue';

import * as Y from 'yjs';
import { marked } from 'marked';
import 'highlight.js/styles/vs.min.css';

const mdHtml = ref('');
const mdText = ref('');

const props = defineProps({
  ytext: {
    type: Object as PropType<Y.Text>,
    required: true,
  },
  basename: {
    type: String,
    required: true,
  },
});

const observeText = async () => {
  mdText.value = props.ytext.toString();
  mdHtml.value = await marked.parse(mdText.value);
};

const create = async () => {
  props.ytext.observe(observeText);

  mdText.value = props.ytext.toString();
  mdHtml.value = await marked(mdText.value);
};

const destroy = () => {
  props.ytext.unobserve(observeText);
};

watch(
  () => props.ytext,
  () => {
    destroy();
    create();
  },
);
onMounted(create);
onBeforeUnmount(destroy);
</script>
