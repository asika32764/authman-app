<script setup lang="ts">

import MainLayout from '@/components/layout/MainLayout.vue';
import { default as vPasswordStrength } from '@/directive/v-password-strength';
import { default as vValidation } from '@/directive/v-validation';
import authService from '@/service/auth-service';
import encryptionService from '@/service/encryption-service';
import passwordResetService from '@/service/password-reset-service';
import { userStorage } from '@/store/main-store';
import { simpleAlert } from '@/utilities/alert';
import useLoading from '@/utilities/loading';
import { sleep } from '@/utilities/timing';
import { IonButton, IonInput, IonItem, IonList, onIonViewDidEnter, useIonRouter } from '@ionic/vue';
import { useCurrentElement } from '@vueuse/core';
import { hexToBigint, timingSafeEquals } from '@windwalker-io/srp';
import { hexToUint8, uint8ToHex } from 'bigint-toolkit';
import { ComponentPublicInstance, ref } from 'vue';

enum PasswordChangeState {
  ENTER_ORIGINAL,
  NEW_PASSWORD
}

onIonViewDidEnter(() => {
  currentPassword.value = '';
  newPassword.value = '';
  state.value = PasswordChangeState.ENTER_ORIGINAL;

  if (currentPasswordInput.value) {
    currentPasswordInput.value!.$el.errorText = '';
  }
});

const router = useIonRouter();
const state = ref(PasswordChangeState.ENTER_ORIGINAL);
const { loading, run } = useLoading();

const el = useCurrentElement<HTMLElement>();
const newPassword = ref('');
const currentPassword = ref('');
const currentPasswordInput = ref<ComponentPublicInstance<typeof IonInput>>();
const currentSecret = ref('');
let secrets: {
  salt?: Uint8Array;
  sess?: Uint8Array;
  kek?: Uint8Array;
  secret?: Uint8Array;
  master?: Uint8Array;
  S?: Uint8Array;
} = {};

async function checkCurrentPassword() {
  secrets = {};

  const user = userStorage.value!;

  await run(async () => {
    const { salt, B, sess } = await authService.challenge(user.email);

    try {
      await authService.authenticateForPasswordChange(
        user.email,
        currentPassword.value,
        sess,
        hexToBigint(salt),
        hexToBigint(B),
      );
    } catch (e) {
      console.error(e);

      if (e instanceof Error) {
        const ionInput = currentPasswordInput.value?.$el as HTMLIonInputElement;
        const $input = await ionInput.getInputElement();
        $input.setCustomValidity(e.message);
        ionInput.dispatchEvent(new CustomEvent('invalid'));
      }
      return;
    }

    const oldKek = await encryptionService.deriveKek(currentPassword.value, hexToUint8(salt));

    secrets.secret = await encryptionService.getSecretKey(oldKek);
    secrets.master = await encryptionService.getMasterKeyBySecret(secrets.secret!);

    state.value = PasswordChangeState.NEW_PASSWORD;

    focusFirstInput();
  }, false);
}

async function checkSecretCode() {
  secrets = {};

  const secret = uint8ToHex(await encryptionService.getSecretKey());
  const providedSecret = currentSecret.value.replace(/-/, '')
    .toLowerCase();

  if (!timingSafeEquals(secret, providedSecret)) {
    simpleAlert('Secret not match');
    return;
  }

  secrets.secret = hexToUint8(providedSecret);
  secrets.master = await encryptionService.getMasterKeyBySecret(secrets.secret);

  state.value = PasswordChangeState.NEW_PASSWORD;

  focusFirstInput();
}

async function focusFirstInput(wait = 800) {
  await sleep(wait);

  const input = el.value.querySelector('input');

  if (input) {
    input.focus();
  }
}

async function submitNewPassword() {
  const user = userStorage.value!;

  await run(async () => {
    if (!secrets.secret || !secrets.master) {
      throw new Error('Missing secrets');
    }

    const {
      B,
      sess,
      salt,
      verifier,
    } = await passwordResetService.challenge(user.email, newPassword.value);

    return await passwordResetService.reset(
      user.email,
      newPassword.value,
      sess,
      salt,
      verifier,
      hexToBigint(B),
      secrets.secret,
      secrets.master,
    );
  });

  router.replace({ name: 'options' });
}

</script>

<template>
  <MainLayout title="Password Change" header-condense>
    <div class="ion-padding">
      <Transition name="fade" mode="out-in">

        <!-- Check current secrets -->
        <div v-if="state === PasswordChangeState.ENTER_ORIGINAL">
          <div>
            <p>
              Please provide your current password.
            </p>
            <ion-list>
              <ion-item lines="none">
                <ion-input
                  ref="currentPasswordInput"
                  label="Password"
                  label-placement="stacked"
                  type="password"
                  v-model="currentPassword"
                  placeholder="****"
                  autocomplete="current-password"
                  v-validation
                />
              </ion-item>
            </ion-list>

            <div style="margin-top: 1.5rem">
              <ion-button expand="full" @click="checkCurrentPassword"
                :disabled="loading || currentPassword === ''">
                Submit
              </ion-button>
            </div>
          </div>

          <!--        <div style="margin-top: 5rem">-->
          <!--          <p>-->
          <!--            If you forgot your password, please provide personal secret code.-->
          <!--          </p>-->

          <!--          <ion-list>-->
          <!--            <ion-item>-->
          <!--              <ion-input-->
          <!--                label="Secret Code"-->
          <!--                label-placement="stacked"-->
          <!--                type="text"-->
          <!--                v-model="currentSecret"-->
          <!--                placeholder="****"-->
          <!--              />-->
          <!--            </ion-item>-->
          <!--          </ion-list>-->

          <!--          <div style="margin-top: 1.5rem">-->
          <!--            <ion-button expand="full" @click="checkSecretCode"-->
          <!--              :disabled="loading">-->
          <!--              Submit-->
          <!--            </ion-button>-->
          <!--          </div>-->
          <!--        </div>-->
        </div>

        <!-- New Password -->
        <div v-else>
          <div>
            <ion-list>
              <ion-item>
                <ion-input
                  v-password-strength
                  label="New Password"
                  label-placement="stacked"
                  type="password"
                  v-model="newPassword"
                  placeholder="****"
                  autocomplete="new-password"
                />
              </ion-item>
            </ion-list>

            <div style="margin-top: 1.5rem">
              <ion-button expand="full" @click="submitNewPassword"
                :disabled="loading">
                Change Password
              </ion-button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </MainLayout>
</template>

<style scoped>

</style>
