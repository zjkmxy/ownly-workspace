<template>
  <ModalComponent :show="show && !!wksp" @close="emit('close')">
    <div class="title is-5 mb-4">Invite people to {{ wksp?.metadata.label }}</div>

    <p>
      An invitation will be generated for each email address. Note that Ownly does not automatically
      send any emails &ndash; you must ask the recipients to join the workspace using the email
      address listed below using the invite link.
    </p>

    <p class="mt-1">
      <code class="select-all">{{ inviteLink }}</code>
    </p>

    <p class="mt-2">Enter upto 100 email addresses or NDN names below, one on each line</p>

    <div class="field mt-2">
      <textarea
        class="textarea"
        rows="8"
        :placeholder="`name@example.com\n/ndn/user-name`"
        autofocus
        v-model="emails"
        :disabled="!isOwner"
      ></textarea>
    </div>

    <p v-if="!isOwner" class="has-text-danger has-text-weight-semibold mt-2">
      You must be the owner of the workspace to invite people
    </p>

    <div class="field has-text-right mt-2">
      <div class="control">
        <button class="button mr-2" @click="emit('close')">Cancel</button>
        <button class="button is-primary soft-if-dark" @click="send" :disabled="!isOwner">
          Invite
        </button>
      </div>
    </div>

    <div class="title is-6 mb-4">Current Workspace Members</div>
    This list currenly only shows members who have published messages in discussions.
    <p v-if="members.length > 0" class="mt-4">
      <pre>{{ members.join('\n') }}</pre>
    </p>
  </ModalComponent>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';
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
const inviteLink = ref(String());
const emails = ref(String());
const isOwner = computed(() => !!wksp.value?.metadata.owner);
const members = ref([] as string[]);

// Do not use the onMounted hook since this component is always mounted
// in the sidebar (the inner modal has the v-if directive)
watch(
  () => props.show,
  async () => {
    wksp.value = await Workspace.setupOrRedir(router);
    if (!wksp.value) return;

    inviteLink.value = await wksp.value.invite.getJoinLink(router);
    members.value = await wksp.value.getMembers();
  },
);

async function send() {
  if (!wksp.value) return;

  // Transform entries to names
  // Check validity and remove blanks and duplicates
  const nameSet = new Set<string>();
  for (const rawEntry of emails.value.split('\n')) {
    const entry = rawEntry.trim();
    if (!entry) continue; // blank line

    // Check if this is an NDN name directly
    if (entry.startsWith('/')) {
      nameSet.add(entry);
    } else {
      // Validate the email address
      if (!utils.validateEmail(entry)) {
        Toast.error(`Invalid email address: ${entry}`);
        return;
      }

      // Convert email to NDN name
      const ndnName = utils.convertEmailToNameLegacy(entry);
      nameSet.add(ndnName);
    }
  }
  if (nameSet.size === 0) {
    Toast.error('No valid email addresses entered');
    return;
  } else if (nameSet.size > 100) {
    Toast.error('Maximum of 100 email addresses allowed');
    return;
  }

  for (const ndnName of nameSet) {
    try {
      // Generate and publish invitation to sync
      await wksp.value.invite.invite(ndnName);
    } catch (err) {
      Toast.error(`Failed to invite ${ndnName}: ${err}`);
      return; // rare
    }
  }

  // Finish
  Toast.success(`Invited ${nameSet.size} users to workspace!`);
  emit('close');
  emails.value = String();
}
</script>

<style scoped lang="scss">
.textarea {
  resize: none;
}
</style>
