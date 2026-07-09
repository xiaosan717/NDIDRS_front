<template>
  <div class="register-container">
    <div class="lang-switch" @click="toggleLang">
      <span>{{ currentLang === 'zh' ? 'English' : '中文' }}</span>
    </div>

    <div class="register-wrapper">
      <div class="register-header">
        <h1 class="brand">{{ t('login.brand') }}</h1>
        <p class="tagline">{{ t('login.tagline') }}</p>
      </div>

      <div class="step-tabs">
        <div class="step-tab active">
          <span class="step-num">01</span>
          <span class="step-label">{{ t('register.basicInfo') }}</span>
        </div>
        <div class="step-tab">
          <span class="step-num">02</span>
          <span class="step-label">{{ t('register.detailInfo') }}</span>
        </div>
      </div>

      <el-form ref="registerForm" :model="form" :rules="rules" class="register-form">
        <el-form-item prop="username">
          <el-input v-model="form.username" :placeholder="t('register.username')" class="input-field" autocomplete="off" />
        </el-form-item>

        <el-form-item prop="email">
          <el-input v-model="form.email" :placeholder="t('register.email')" class="input-field" autocomplete="off" />
        </el-form-item>

        <el-form-item prop="code">
          <div class="code-row">
            <el-input v-model="form.code" :placeholder="t('register.code')" class="input-field code-input" autocomplete="off" />
            <el-button
              class="code-btn"
              @click="sendCode"
              :disabled="countdown > 0 || !isEmailValid"
            >
              {{ countdown > 0 ? `${countdown}s` : t('register.sendCode') }}
            </el-button>
          </div>
        </el-form-item>

        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" :placeholder="t('register.password')" class="input-field" show-password autocomplete="new-password" />
        </el-form-item>

        <el-form-item prop="confirmPassword">
          <el-input v-model="form.confirmPassword" type="password" :placeholder="t('register.confirmPassword')" class="input-field" show-password autocomplete="new-password" />
        </el-form-item>

        <el-form-item>
          <el-button class="submit-btn" @click="handleStep1" :loading="loading">
            {{ t('register.next') }}
          </el-button>
        </el-form-item>
      </el-form>

      <div class="register-footer">
        <span>{{ t('register.haveAccount') }}</span>
        <span class="login-link" @click="goToLogin">{{ t('register.login') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import request from '../utils/request'

const { t, locale } = useI18n()
const router = useRouter()

const currentLang = computed(() => locale.value)
const registerForm = ref(null)

const toggleLang = () => {
  const newLang = locale.value === 'zh' ? 'en' : 'zh'
  locale.value = newLang
  localStorage.setItem('locale', newLang)
}

const loading = ref(false)
const countdown = ref(0)

const form = reactive({
  username: '',
  email: '',
  code: '',
  password: '',
  confirmPassword: ''
})

const isEmailValid = computed(() => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
})

const rules = {
  username: [
    { required: true, message: t('common.required'), trigger: 'blur' },
    { min: 3, max: 20, message: t('register.usernameLength'), trigger: 'blur' }
  ],
  email: [
    { required: true, message: t('common.required'), trigger: 'blur' },
    { type: 'email', message: t('register.emailFormat'), trigger: 'blur' }
  ],
  code: [{ required: true, message: t('common.required'), trigger: 'blur' }],
  password: [
    { required: true, message: t('common.required'), trigger: 'blur' },
    { min: 6, max: 20, message: t('register.passwordLength'), trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: t('common.required'), trigger: 'blur' },
    { validator: (rule, value, callback) => {
      if (value !== form.password) {
        callback(new Error(t('register.passwordNotMatch')))
      } else {
        callback()
      }
    }, trigger: 'blur' }
  ]
}

const sendCode = async () => {
  if (!form.email) {
    ElMessage.warning(t('register.enterEmail'))
    return
  }

  try {
    const res = await request.post('/sendCode', { email: form.email })
    if (res.code === 200) {
      ElMessage.success(t('register.codeSent'))
      countdown.value = 60
      const timer = setInterval(() => {
        countdown.value--
        if (countdown.value <= 0) {
          clearInterval(timer)
        }
      }, 1000)
    } else {
      ElMessage.error(res.message)
    }
  } catch (error) {
    ElMessage.error(t('register.codeSendFailed'))
  }
}

const handleStep1 = async () => {
  if (!registerForm.value) return

  try {
    await registerForm.value.validate()
  } catch {
    return
  }

  if (form.password !== form.confirmPassword) {
    ElMessage.warning(t('register.passwordNotMatch'))
    return
  }

  loading.value = true
  try {
    const res = await request.post('/register/step1', {
      username: form.username,
      password: form.password,
      email: form.email,
      code: form.code
    })
    if (res.code === 200) {
      ElMessage.success(t('register.step1Success'))
      localStorage.setItem('registerUserId', res.data.userId)
      localStorage.setItem('registerUsername', res.data.username)
      router.push('/register/step2')
    } else {
      ElMessage.error(res.message)
    }
  } catch (error) {
    ElMessage.error(t('register.registerFailed'))
  } finally {
    loading.value = false
  }
}

const goToLogin = () => {
  router.push('/login')
}
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  position: relative;
}

.lang-switch {
  position: absolute;
  top: 40px;
  right: 40px;
  font-size: 14px;
  font-weight: 500;
  color: #999999;
  cursor: pointer;
  padding: 8px 16px;
  border: 1px solid #e5e5e5;
  transition: all 0.3s ease;
}

.lang-switch:hover {
  color: #000000;
  border-color: #000000;
}

.register-wrapper {
  width: 520px;
  padding: 60px 60px;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.register-header {
  text-align: center;
  margin-bottom: 40px;
}

.brand {
  font-size: 48px;
  font-weight: 900;
  letter-spacing: -2px;
  color: #000000;
  margin: 0 0 12px;
}

.tagline {
  font-size: 14px;
  font-weight: 300;
  letter-spacing: 1.5px;
  color: #888888;
  margin: 0;
  text-transform: uppercase;
}

.step-tabs {
  display: flex;
  border-bottom: 2px solid #f0f0f0;
  margin-bottom: 36px;
}

.step-tab {
  flex: 1;
  padding: 14px 0;
  text-align: center;
  cursor: default;
  transition: all 0.25s ease;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.step-num {
  font-size: 12px;
  font-weight: 700;
  color: #cccccc;
  letter-spacing: 1px;
}

.step-label {
  font-size: 14px;
  font-weight: 500;
  color: #999999;
}

.step-tab.active .step-num {
  color: #000000;
}

.step-tab.active .step-label {
  color: #000000;
  font-weight: 700;
}

.step-tab.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 40%;
  height: 2px;
  background: #000000;
}

.register-form {
  margin-bottom: 32px;
}

.input-field {
  border-radius: 0;
  border: none;
  border-bottom: 2px solid #e5e5e5;
  padding: 20px 0;
  font-size: 16px;
  transition: border-color 0.3s ease;
}

.input-field:focus {
  border-bottom-color: #000000;
  box-shadow: none;
}

:deep(.el-input__wrapper) {
  border-radius: 0;
  border: none;
  border-bottom: 2px solid #e5e5e5;
  box-shadow: none;
  padding: 8px 0;
  font-size: 16px;
  background: transparent;
}

:deep(.el-input__wrapper.is-focus) {
  border-bottom-color: #000000;
  box-shadow: none;
}

.code-row {
  display: flex;
  gap: 16px;
  align-items: flex-end;
}

.code-input {
  flex: 1;
}

.code-btn {
  height: 40px;
  min-width: 100px;
  background: transparent;
  color: #000000;
  border: 1px solid #000000;
  border-radius: 0;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1px;
  transition: all 0.25s ease;
  margin-bottom: 8px;
}

.code-btn:hover:not(:disabled) {
  background: #000000;
  color: #ffffff;
}

.code-btn:disabled {
  background: #f5f5f5;
  color: #bbbbbb;
  border-color: #e5e5e5;
}

.submit-btn {
  width: 100%;
  height: 56px;
  border-radius: 0;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 3px;
  background: #000000;
  color: #ffffff;
  border: none;
  text-transform: uppercase;
  transition: background 0.3s ease;
  margin-top: 8px;
}

.submit-btn:hover {
  background: #333333;
}

.submit-btn:active {
  background: #000000;
}

.register-footer {
  text-align: center;
  font-size: 14px;
  color: #aaaaaa;
}

.login-link {
  color: #000000;
  font-weight: 600;
  cursor: pointer;
  margin-left: 4px;
}

.login-link:hover {
  text-decoration: underline;
}

:deep(.el-form-item) {
  margin-bottom: 8px;
}

:deep(.el-form-item__error) {
  font-size: 12px;
  color: #ff4757;
  padding-top: 4px;
}

@media (max-width: 600px) {
  .register-wrapper {
    width: 100%;
    padding: 40px 30px;
  }

  .brand {
    font-size: 36px;
  }

  .code-row {
    flex-direction: column;
    gap: 0;
    align-items: stretch;
  }

  .code-btn {
    width: 100%;
    margin-bottom: 16px;
  }
}
</style>
