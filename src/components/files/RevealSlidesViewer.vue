<template>
  <div class="revealviewer" ref="revealviewer" v-html="mdHtml">
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch, type PropType } from 'vue';

import * as Y from 'yjs';
import Reveal from 'reveal.js';
import Markdown from 'reveal.js/plugin/markdown/markdown.esm.js';
// import 'highlight.js/styles/vs.min.css';
import 'reveal.js/dist/reveal.css';
import 'reveal.js/dist/theme/solarized.css';

const mdText = ref('');
const mdHtml = ref('');
const revealDeck = ref(null as Reveal.Api | null);

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
  mdHtml.value = `<div class="reveal">
      <div class="slides">
        <section data-markdown>
          <textarea data-template>${mdText.value}</textarea>
        </section>
      </div>
    </div>`
  globalThis.setTimeout(() => {
    revealDeck.value?.destroy();
    revealDeck.value = new Reveal({
      plugins: [Markdown],
    });
    revealDeck.value?.initialize();
  }, 100);
};

const create = async () => {
  props.ytext.observe(observeText);
  await observeText();
};

const destroy = () => {
  props.ytext.unobserve(observeText);
  revealDeck.value?.destroy();
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
