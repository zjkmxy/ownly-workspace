<template>
  <div class="wrapper">
    <Transition name="fade-rtl" mode="out-in">
      <LoadingSpinner
        v-if="showLoading"
        class="has-text-white-bis has-text-centered"
        :text="loadStatus"
      />

      <div class="box anim-rtl-fade p-4" v-else-if="!showSuccess">
        <div class="header is-size-4 has-text-weight-semibold">Get started</div>
        <p class="subtitle mt-1">
          Choose the authentication method that works best for you.
        </p>

        <div class="method-toggle mt-3">
          <button
            class="toggle"
            :class="{ active: authMethod === 'email' }"
            type="button"
            :disabled="methodSwitchDisabled && authMethod !== 'email'"
            @click="selectMethod('email')"
          >
            Email
          </button>
          <button
            class="toggle"
            :class="{ active: authMethod === 'dns' }"
            type="button"
            :disabled="methodSwitchDisabled && authMethod !== 'dns'"
            @click="selectMethod('dns')"
          >
            DNS
          </button>
        </div>

        <div class="login mt-4">
          <template v-if="authMethod === 'email'">
            <div v-if="emailStep === 'input'">
              <div class="field">
                <label>First, you need an email address to verify your unique identity.</label>
                <div class="control has-icons-left has-icons-right mt-3">
                  <input
                    :class="{ input: true, 'is-danger': emailError }"
                    inputmode="email"
                    autocomplete="email"
                    type="email"
                    placeholder="name@email.com"
                    v-model="emailAddress"
                    @keyup.enter="emailSubmit"
                  />
                  <span class="icon is-small is-left">
                    <FontAwesomeIcon :icon="faEnvelope" />
                  </span>

                  <span class="icon is-small is-right" v-if="emailError">
                    <FontAwesomeIcon :icon="faExclamationTriangle" />
                  </span>
                </div>
                <p v-if="emailError" class="help is-danger">{{ emailError }}</p>
              </div>

              <button class="button mt-3 is-primary is-fullwidth" @click="emailSubmit">
                Continue
              </button>
            </div>

            <div v-else>
              <div class="field">
                <label>
                  We have sent a verification code to your email address. Enter the code below to
                  continue.
                </label>
                <div class="control has-icons-left mt-3">
                  <input
                    :class="{ input: true, 'is-danger': codeError }"
                    inputmode="numeric"
                    pattern="[0-9]{6}"
                    autocomplete="off"
                    type="text"
                    placeholder="123456"
                    maxlength="6"
                    minlength="6"
                    v-model="codeInput"
                    @keypress="disallowNonNumeric"
                    @keyup="codeSubmitHandler"
                  />
                  <span class="icon is-small is-left">
                    <FontAwesomeIcon :icon="faKey" />
                  </span>
                </div>
                <p v-if="codeError" class="help is-danger">{{ codeError }}</p>

                <a class="is-size-7 mt-3 ml-1" @click="codeCancel"> Go back to the previous step </a>
              </div>
            </div>
          </template>

          <template v-else>
            <div v-if="dnsStep === 'input'">
              <div class="field">
                <label class="mt-2">First, you need to own domain to verify your unique identity.</label>
                <div class="control has-icons-left has-icons-right mt-3">
                  <input
                    :class="{ input: true, 'is-danger': domainError }"
                    inputmode="url"
                    autocomplete="off"
                    type="text"
                    placeholder="example.com"
                    v-model="domainName"
                    @keyup.enter="domainSubmit"
                  />
                  <span class="icon is-small is-left">
                    <FontAwesomeIcon :icon="faGlobe" />
                  </span>

                  <span class="icon is-small is-right" v-if="domainError">
                    <FontAwesomeIcon :icon="faExclamationTriangle" />
                  </span>
                </div>
                <p v-if="domainError" class="help is-danger">{{ domainError }}</p>
              </div>

              <button class="button mt-3 is-primary is-fullwidth" @click="domainSubmit">
                Continue
              </button>
            </div>

            <div v-else>
              <div class="field">
                <label class="mt-2">Publish this TXT record under {{ domainName }}.</label>
                <div class="dns-record mt-3">
                  <div class="row">
                    <div>
                      <span class="label">Name</span>
                      <code>{{ dnsRecordName || '--' }}</code>
                    </div>
                    <button
                      v-if="dnsRecordName"
                      class="copy"
                      type="button"
                      @click="copyValue(dnsRecordName, 'record name')"
                    >
                      Copy
                    </button>
                  </div>
                  <div class="row mt-2">
                    <div>
                      <span class="label">Type</span>
                      <code>TXT</code>
                    </div>
                  </div>
                  <div class="row mt-2">
                    <div>
                      <span class="label">Value</span>
                      <code class="value">{{ dnsRecordValueDisplay || '--' }}</code>
                    </div>
                    <button
                      v-if="dnsRecordValueDisplay"
                      class="copy"
                      type="button"
                      @click="copyValue(dnsRecordValueDisplay, 'record value')"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              <button
                class="button mt-3 is-primary is-fullwidth"
                type="button"
                :disabled="!canConfirmDns"
                @click="dnsConfirm"
              >
                The TXT record is ready
              </button>
              <p v-if="copyNotice" class="help is-success mt-2">{{ copyNotice }}</p>
            </div>
          </template>
        </div>
      </div>

      <div class="anim-rtl-fade p-4 has-text-centered" v-else>
        <FontAwesomeIcon class="success" :icon="faCircleCheck" />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

import LoadingSpinner from '@/components/LoadingSpinner.vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import {
  faEnvelope,
  faExclamationTriangle,
  faKey,
  faCircleCheck,
  faGlobe,
} from '@fortawesome/free-solid-svg-icons';

import * as utils from '@/utils/index';
import ndn from '@/services/ndn';
import { Toast } from '@/utils/toast';

const emit = defineEmits(['login', 'ready']);

const showLoading = ref(true);
const showSuccess = ref(false);

const loadStatus = ref(String());

const authMethod = ref<'email' | 'dns'>('email');
const methodSwitchDisabled = computed(
  () =>
    showLoading.value || emailStep.value === 'code' || dnsConfirmResolver.value !== null,
);

const emailStep = ref<'input' | 'code'>('input');
const emailAddress = ref(String());
const emailError = ref(String());

const codeInput = ref(String());
const codeError = ref(String());
const codeSubmit = ref<() => void>(() => {});
const codeSubmitHandler = () => codeSubmit.value();

const dnsStep = ref<'input' | 'record'>('input');
const domainName = ref(String());
const domainError = ref(String());
const dnsRecordName = ref(String());
const dnsRecordValue = ref(String());
const dnsStatus = ref(String());
const dnsConfirmResolver = ref<null | ((value: string) => void)>(null);
const canConfirmDns = computed(() => dnsConfirmResolver.value !== null);
const copyNotice = ref(String());
let copyTimeout: ReturnType<typeof setTimeout> | undefined;

const dnsRecordValueDisplay = computed(() => {
  const raw = dnsRecordValue.value.trim();
  if (!raw) return '';
  const hasQuotes = raw.startsWith('"') && raw.endsWith('"');
  return hasQuotes ? raw : `"${raw}"`;
});

function selectMethod(method: 'email' | 'dns') {
  if (authMethod.value === method) return;
  if (methodSwitchDisabled.value) return;

  authMethod.value = method;

  if (method === 'email') {
    emailStep.value = 'input';
    emailError.value = '';
  } else {
    dnsStep.value = 'input';
    domainError.value = '';
  }
}

/** Validate email and move to step 2 */
function emailSubmit() {
  if (emailStep.value !== 'input') return;

  if (!emailAddress.value) {
    emailError.value = 'Email address is required';
    return;
  }

  if (!utils.validateEmail(emailAddress.value)) {
    emailError.value = 'Invalid email address';
    return;
  }

  emailError.value = '';
  startEmailChallenge();
}

/** Cancel code verification and go back to email step */
function codeCancel() {
  if (methodSwitchDisabled.value && emailStep.value !== 'code') return;
  codeError.value = '';
  codeInput.value = '';
  emailStep.value = 'input';
}

async function startEmailChallenge() {
  showLoading.value = true;

  try {
    loadStatus.value = 'Connecting to NDN testbed ...';
    await ndn.api.connect_testbed();

    loadStatus.value = 'Starting NDNCERT challenge ...';
    await ndn.api.ndncert_email(emailAddress.value, (status) => {
      codeError.value = '';
      codeInput.value = '';

      switch (status) {
        case 'need-code':
          break;
        case 'wrong-code':
          codeError.value = 'Invalid verification code';
          break;
        default:
          codeError.value = 'Verification error: ' + status;
          break;
      }

      showLoading.value = false;
      emailStep.value = 'code';

      return new Promise((resolve) => {
        codeSubmit.value = () => {
          if (codeInput.value.length !== 6) return;

          showLoading.value = true;
          loadStatus.value = 'Completing challenge ...';
          resolve(codeInput.value);
        };
      });
    });

    loadStatus.value = 'Certified!';
    showLoading.value = false;
    showSuccess.value = true;
    setTimeout(() => emit('login'), 1500);
  } catch (err) {
    Toast.error('Failed to complete challenge');
    console.error(err);
    showLoading.value = false;
    emailStep.value = 'input';
  } finally {
    codeSubmit.value = () => {};
  }
}

function validateDomain(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return { valid: false, formatted: trimmed };
  const pattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i;
  return { valid: pattern.test(trimmed) && trimmed.length <= 253, formatted: trimmed };
}

function domainSubmit() {
  if (dnsStep.value !== 'input') return;

  const { valid, formatted } = validateDomain(domainName.value);
  if (!formatted) {
    domainError.value = 'Domain is required';
    return;
  }
  if (!valid) {
    domainError.value = 'Invalid domain name';
    return;
  }

  domainError.value = '';
  domainName.value = formatted;
  startDnsChallenge();
}

async function startDnsChallenge() {
  showLoading.value = true;
  dnsStatus.value = '';
  dnsRecordName.value = '';
  dnsRecordValue.value = '';

  try {
    loadStatus.value = 'Connecting to NDN testbed ...';
    await ndn.api.connect_testbed();

    loadStatus.value = 'Starting NDNCERT challenge ...';
    await ndn.api.ndncert_dns(domainName.value, (recordName, recordValue, status) => {
      dnsStatus.value = status;
      dnsRecordName.value = recordName;
      dnsRecordValue.value = recordValue;

      showLoading.value = false;
      dnsStep.value = 'record';

      return new Promise((resolve) => {
        dnsConfirmResolver.value = (value: string) => {
          resolve(value);
          dnsConfirmResolver.value = null;
        };
      });
    });

    loadStatus.value = 'Certified!';
    showLoading.value = false;
    showSuccess.value = true;
    setTimeout(() => emit('login'), 1500);
  } catch (err) {
    Toast.error('Failed to complete challenge');
    console.error(err);
    showLoading.value = false;
    dnsStep.value = 'input';
  } finally {
    dnsConfirmResolver.value = null;
  }
}

function dnsConfirm() {
  if (!dnsConfirmResolver.value) return;

  showLoading.value = true;
  loadStatus.value =
    dnsStatus.value === 'wrong-record' ? 'Retrying DNS verification ...' : 'Completing challenge ...';

  const resolver = dnsConfirmResolver.value;
  dnsConfirmResolver.value = null;
  resolver('ready');
}

async function setup() {
  try {
    loadStatus.value = 'Setting up NDN service ...';
    await ndn.setup();

    await ndn.api.connect_testbed();

    if (await ndn.api.has_testbed_key()) {
      const isExpiringSoon = await ndn.api.is_testbed_cert_expiring_soon();
      if (isExpiringSoon) {
        console.log('latest certificate is expiring soon');
        showLoading.value = false;
        authMethod.value = 'email';
        emailStep.value = 'input';
        emit('ready');
        return;
      }

      showLoading.value = false;
      showSuccess.value = true;
      setTimeout(() => emit('login'), 250);
      return;
    }

    showLoading.value = false;
    emailStep.value = 'input';
    dnsStep.value = 'input';
    authMethod.value = 'email';
    emit('ready');
  } catch (err) {
    console.error(err);
  }
}

onMounted(setup);

onUnmounted(() => {
  if (copyTimeout) clearTimeout(copyTimeout);
});

function disallowNonNumeric(event: KeyboardEvent) {
  if (!/^\d+$/.test(event.key) && !['Backspace', 'Delete'].includes(event.key)) {
    event.preventDefault();
  }
}

async function copyValue(value: string, label: string) {
  if (!value) return;

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = value;
      textArea.setAttribute('readonly', '');
      textArea.style.position = 'absolute';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }

    if (copyTimeout) clearTimeout(copyTimeout);
    copyNotice.value = `Copied ${label}!`;
    copyTimeout = setTimeout(() => {
      copyNotice.value = '';
    }, 2500);
  } catch (err) {
    console.error(err);
    Toast.error('Unable to copy to clipboard');
  }
}
</script>

<style scoped lang="scss">
.wrapper {
  display: flex;
  flex-direction: column;
}

.method-toggle {
  display: flex;
  gap: 0.75rem;
}

.method-toggle .toggle {
  flex: 1;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  transition: background 0.2s ease;
}

.method-toggle .toggle.active {
  background: #3273dc;
  border-color: #3273dc;
}

.method-toggle .toggle:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.dns-record {
  background: rgba(50, 115, 220, 0.08);
  border-radius: 6px;
  padding: 1rem;
}

.dns-record .row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.dns-record .copy {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: #fff;
  padding: 0.25rem 0.75rem;
  font-size: 0.8rem;
  transition: background 0.2s ease;
}

.dns-record .copy:hover {
  background: rgba(255, 255, 255, 0.2);
}

.dns-record .label {
  display: block;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.7);
}

.dns-record code {
  display: inline-block;
  margin-top: 0.2rem;
  font-size: 0.95rem;
  word-break: break-word;
}

.dns-record code.value {
  word-break: break-all;
}

.step-chip {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  padding: 0.15rem 0.75rem;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.9);
}


.success {
  color: white;
  font-size: 5rem;
}

@media (min-width: 1024px) {
  .wrapper {
    margin: auto;
    margin-right: 10vw;
    min-width: 350px;
  }
}

@media (max-width: 1023px) {
  .wrapper.login {
    max-width: 400px;
    margin: 0 auto;
  }
}
</style>
