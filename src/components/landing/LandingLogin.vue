<template>
  <div class="wrapper">
    <Transition @after-leave="afterTransition">
      <div class="loading anim-fade has-text-white-bis" v-if="showLoading">
        <Spinner />
      </div>
    </Transition>

    <Transition @after-leave="afterTransition">
      <div class="box anim-rtl-fade p-4" v-if="showEmail">
        <div class="header is-size-4 has-text-weight-semibold">Get started</div>

        <div class="login mt-2">
          First, you need an email address to verify your unique identity.
          <input class="input mt-3" type="email" placeholder="name@email.com" />

          <button class="button mt-3 is-primary is-fullwidth" @click="submitEmail">Continue</button>
        </div>
      </div>
    </Transition>

    <Transition @after-leave="afterTransition">
      <div class="box anim-rtl-fade p-4" v-if="showCode">
        <div class="header is-size-4 has-text-weight-semibold">Let's verify you</div>

        <div class="login mt-2">
          We have sent a verification code to your email address. Enter the code below to continue.
          <input class="input mt-3" type="text" placeholder="123456" />

          <button class="button mt-3 is-primary is-fullwidth">Continue</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Spinner from '@/components/Spinner.vue'

let showLoading = ref(false)
let showEmail = ref(true)
let showCode = ref(false)
let afterTransition = ref(() => {})

function submitEmail() {
  afterTransition.value = () => (showLoading.value = true)
  showEmail.value = false
}
</script>

<style scoped lang="scss">
.wrapper {
  display: flex;
  flex-direction: column;
}

@media (min-width: 1024px) {
  .wrapper {
    margin: auto;
    margin-right: 10vw;
    min-width: 350px;
  }
}
</style>
