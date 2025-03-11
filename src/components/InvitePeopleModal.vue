<template>
  <ModalComponent :show="show && !!wksp" @close="emit('close')">
    <div class="title is-5 mb-4">Invite people to {{ wksp?.metadata.label }}</div>

    <p>
      An invitation will be generated for each email address. Note that Ownly does not automatically
      send any emails &ndash; you must ask the recipients to join the workspace
      <code class="wksp-name">{{ wksp?.metadata.name }}</code> using the email address listed below.
    </p>

    <p class="mt-1">Enter upto 100 email addresses below, one on each line</p>

    <div class="field mt-2">
      <textarea
        class="textarea"
        rows="10"
        placeholder="name@example.com"
        autofocus
        v-model="emails"
      ></textarea>
    </div>

    <div class="field has-text-right mt-2">
      <div class="control">
        <button class="button mr-2" @click="emit('close')">Cancel</button>
        <button class="button is-primary soft-if-dark" @click="send">Send</button>
      </div>
    </div>
  </ModalComponent>
</template>

<script setup lang="ts">
import { ref, shallowRef, watch } from 'vue';
import { useRouter } from 'vue-router';

import ModalComponent from './ModalComponent.vue';

import * as utils from '@/utils';
import { Workspace } from '@/services/workspace';
import { Toast } from '@/utils/toast';

const props = defineProps({
  show: {
    type: Boolean,
    required: true,
  },
});
const emit = defineEmits(['close']);
const router = useRouter();

const wksp = shallowRef<Workspace | null>(null);
const emails = ref(String());

// Do not use the onMounted hook since this component is always mounted
// in the sidebar (the inner modal has the v-if directive)
watch(
  () => props.show,
  async () => {
    wksp.value = await Workspace.setupOrRedir(router);
  },
);

async function send() {
  if (!wksp.value) return;

  // Transform list of emails - check validity and remove blanks and duplicates
  const emailSet = new Set<string>();
  for (let email of emails.value.split('\n')) {
    email = email.trim();
    if (!email) continue; // blank line

    if (!utils.validateEmail(email)) {
      Toast.error(`Invalid email address: ${email}`);
      return;
    }

    emailSet.add(email);
  }
  if (emailSet.size === 0) {
    Toast.error('No valid email addresses entered');
    return;
  }

  for (const email of emailSet) {
    const ndnName = utils.convertEmailToName(email);

    // Generate and publish invitation to sync
    await wksp.value.invite.invite(ndnName);
  }
}
</script>

<style scoped lang="scss">
.wksp-name {
  user-select: all;
}

.textarea {
  resize: none;
}
</style>
