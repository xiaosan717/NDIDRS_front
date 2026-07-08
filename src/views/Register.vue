<template>
  <div class="register-container">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="line line-1"></div>
      <div class="line line-2"></div>
      <div class="line line-3"></div>
    </div>

    <div class="lang-switch" @click="toggleLang">
      <span>{{ currentLang === 'zh' ? 'EN' : '中' }}</span>
    </div>

    <div class="register-wrapper">
      <div class="register-header">
        <div class="logo-icon">
          <el-icon :size="48"><School /></el-icon>
        </div>
        <h1 class="brand">{{ t('login.brand') }}</h1>
        <p class="tagline">{{ t('login.tagline') }}</p>
        <div class="header-divider">
          <span class="divider-line"></span>
          <span class="divider-dot"></span>
          <span class="divider-line"></span>
        </div>
      </div>

      <el-form ref="registerForm" :model="form" :rules="rules" class="register-form">
        <!-- 基本信息区块 -->
        <div class="form-section">
          <div class="section-header">
            <div class="section-number">01</div>
            <div class="section-title">{{ t('register.basicInfo') }}</div>
          </div>

          <el-form-item prop="username">
            <el-input v-model="form.username" :placeholder="t('register.username')" class="input-field">
              <template #prefix>
                <el-icon><User /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item prop="realName">
            <el-input v-model="form.realName" :placeholder="t('register.realName')" class="input-field">
              <template #prefix>
                <el-icon><UserFilled /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item prop="phone">
            <el-input v-model="form.phone" :placeholder="t('register.phone')" class="input-field">
              <template #prefix>
                <el-icon><Phone /></el-icon>
              </template>
            </el-input>
          </el-form-item>
        </div>

        <!-- 学籍信息区块 -->
        <div class="form-section">
          <div class="section-header">
            <div class="section-number">02</div>
            <div class="section-title">{{ t('register.schoolInfo') || '学籍信息' }}</div>
          </div>

          <el-form-item prop="college">
            <el-select v-model="form.college" :placeholder="t('register.pleaseSelectCollege')" class="input-field select-field" @change="handleCollegeChange">
              <template #prefix>
                <el-icon><OfficeBuilding /></el-icon>
              </template>
              <el-option v-for="item in collegeList" :key="item.id" :label="item.collegeName" :value="item.collegeName" />
            </el-select>
          </el-form-item>

          <el-form-item prop="classId">
            <el-select v-model="form.classId" :placeholder="t('register.pleaseSelectClass')" class="input-field select-field" :disabled="!form.college" @change="handleClassChange">
              <template #prefix>
                <el-icon><Collection /></el-icon>
              </template>
              <el-option v-for="item in classList" :key="item.id" :label="item.grade + '-' + item.className" :value="item.id" />
            </el-select>
          </el-form-item>

          <el-form-item prop="building">
            <el-select v-model="form.building" :placeholder="t('register.pleaseSelectBuilding')" class="input-field select-field" @change="handleBuildingChange">
              <template #prefix>
                <el-icon><HomeFilled /></el-icon>
              </template>
              <el-option v-for="item in buildingList" :key="item.id" :label="item.buildingName" :value="item.buildingName" />
            </el-select>
          </el-form-item>

          <el-form-item prop="room">
            <el-select v-model="form.room" :placeholder="t('register.pleaseSelectRoom')" class="input-field select-field" :disabled="!form.building">
              <template #prefix>
                <el-icon><House /></el-icon>
              </template>
              <el-option v-for="item in roomList" :key="item.id" :label="item.roomNumber" :value="item.roomNumber" />
            </el-select>
          </el-form-item>

          <el-form-item prop="isDormLeader">
            <div class="dorm-leader-option">
              <el-checkbox v-model="form.isDormLeader" class="leader-checkbox">
                <span class="checkbox-text">
                  <el-icon><Star /></el-icon>
                  {{ t('register.dormLeader') || '我是宿舍长' }}
                </span>
              </el-checkbox>
              <span class="leader-tip" v-if="form.isDormLeader">{{ t('register.dormLeaderTip') || '每个宿舍仅可有一名宿舍长' }}</span>
            </div>
          </el-form-item>
        </div>

        <!-- 验证信息区块 -->
        <div class="form-section">
          <div class="section-header">
            <div class="section-number">03</div>
            <div class="section-title">{{ t('register.verifyInfo') }}</div>
          </div>

          <el-form-item prop="email">
            <el-input v-model="form.email" :placeholder="t('register.email')" class="input-field">
              <template #prefix>
                <el-icon><Message /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item prop="code">
            <div class="code-row">
              <el-input v-model="form.code" :placeholder="t('register.code')" class="code-input">
                <template #prefix>
                  <el-icon><Key /></el-icon>
                </template>
              </el-input>
              <el-button
                class="code-btn"
                @click="sendCode"
                :disabled="countdown > 0 || !isEmailValid"
                :class="{ 'btn-active': countdown > 0 }"
              >
                {{ countdown > 0 ? `${countdown}s` : t('register.sendCode') }}
              </el-button>
            </div>
          </el-form-item>
        </div>

        <!-- 密码信息区块 -->
        <div class="form-section">
          <div class="section-header">
            <div class="section-number">04</div>
            <div class="section-title">{{ t('register.passwordInfo') }}</div>
          </div>

          <el-form-item prop="password">
            <el-input v-model="form.password" type="password" :placeholder="t('register.password')" class="input-field" show-password>
              <template #prefix>
                <el-icon><Lock /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item prop="confirmPassword">
            <el-input v-model="form.confirmPassword" type="password" :placeholder="t('register.confirmPassword')" class="input-field" show-password>
              <template #prefix>
                <el-icon><Lock /></el-icon>
              </template>
            </el-input>
          </el-form-item>
        </div>

        <el-form-item>
          <el-button class="register-btn" @click="handleRegister" :loading="loading">
            <span class="btn-text">{{ t('register.register') }}</span>
            <el-icon class="btn-icon"><ArrowRight /></el-icon>
          </el-button>
        </el-form-item>
      </el-form>

      <div class="register-footer">
        <span class="footer-text">{{ t('register.haveAccount') }}</span>
        <span class="footer-link" @click="goToLogin">
          {{ t('register.login') }}
          <el-icon><ArrowRight /></el-icon>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElIcon } from 'element-plus'
import { User, UserFilled, Phone, Message, Key, Lock, ArrowRight, School, OfficeBuilding, Collection, HomeFilled, House, Star } from '@element-plus/icons-vue'
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

const collegeList = ref([])
const classList = ref([])
const buildingList = ref([])
const roomList = ref([])

const form = reactive({
  username: '',
  realName: '',
  email: '',
  phone: '',
  college: '',
  classId: null,
  className: '',
  grade: '',
  building: '',
  room: '',
  isDormLeader: false,
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
  realName: [{ required: true, message: t('common.required'), trigger: 'blur' }],
  email: [
    { required: true, message: t('common.required'), trigger: 'blur' },
    { type: 'email', message: t('register.emailFormat'), trigger: 'blur' }
  ],
  phone: [
    { required: true, message: t('common.required'), trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: t('register.phoneFormat'), trigger: 'blur' }
  ],
  college: [{ required: true, message: t('common.required'), trigger: 'change' }],
  classId: [{ required: true, message: t('common.required'), trigger: 'change' }],
  building: [{ required: true, message: t('common.required'), trigger: 'change' }],
  room: [{ required: true, message: t('common.required'), trigger: 'change' }],
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

const loadColleges = async () => {
  try {
    const res = await request.get('/dict/colleges')
    if (res.code === 200) {
      collegeList.value = res.data || []
    }
  } catch (error) {
    console.error('加载学院失败', error)
  }
}

const loadClasses = async (collegeName) => {
  try {
    const res = await request.get('/dict/classes', { params: { collegeName } })
    if (res.code === 200) {
      classList.value = res.data || []
    }
  } catch (error) {
    console.error('加载班级失败', error)
  }
}

const loadBuildings = async () => {
  try {
    const res = await request.get('/dict/buildings')
    if (res.code === 200) {
      buildingList.value = res.data || []
    }
  } catch (error) {
    console.error('加载楼栋失败', error)
  }
}

const loadRooms = async (buildingName) => {
  try {
    const res = await request.get('/dict/rooms', { params: { buildingName } })
    if (res.code === 200) {
      roomList.value = res.data || []
    }
  } catch (error) {
    console.error('加载宿舍失败', error)
  }
}

const handleCollegeChange = (val) => {
  form.classId = null
  form.className = ''
  form.grade = ''
  if (val) {
    loadClasses(val)
  } else {
    classList.value = []
  }
}

const handleClassChange = (val) => {
  const selected = classList.value.find(item => item.id === val)
  if (selected) {
    form.className = selected.className
    form.grade = selected.grade
  } else {
    form.className = ''
    form.grade = ''
  }
}

const handleBuildingChange = (val) => {
  form.room = ''
  if (val) {
    loadRooms(val)
  } else {
    roomList.value = []
  }
}

loadColleges()
loadBuildings()

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

const handleRegister = async () => {
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
    const res = await request.post('/register', {
      username: form.username,
      password: form.password,
      email: form.email,
      phone: form.phone,
      realName: form.realName,
      code: form.code,
      college: form.college,
      className: form.className,
      grade: form.grade,
      building: form.building,
      room: form.room,
      isDormLeader: form.isDormLeader
    })
    if (res.code === 200) {
      ElMessage.success(t('register.registerSuccess'))
      router.push('/')
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
  router.push('/')
}
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%);
  position: relative;
  overflow: hidden;
}

/* 背景装饰线条 */
.bg-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  z-index: 0;
}

.line {
  position: absolute;
  background: #000000;
  opacity: 0.03;
}

.line-1 {
  width: 1px;
  height: 100%;
  left: 10%;
}

.line-2 {
  width: 1px;
  height: 100%;
  left: 50%;
}

.line-3 {
  width: 1px;
  height: 100%;
  right: 10%;
}

.lang-switch {
  position: absolute;
  top: 30px;
  right: 30px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 2px solid #000000;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  color: #000000;
  transition: all 0.3s ease;
  z-index: 10;
}

.lang-switch:hover {
  background: #000000;
  color: #ffffff;
  transform: scale(1.1);
}

.register-wrapper {
  width: 100%;
  max-width: 520px;
  padding: 60px 50px;
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1;
}

.register-header {
  text-align: center;
  margin-bottom: 50px;
}

.logo-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  color: #000000;
}

.brand {
  font-size: 42px;
  font-weight: 900;
  letter-spacing: -4px;
  color: #000000;
  margin: 0 0 12px;
}

.tagline {
  font-size: 14px;
  color: #666666;
  margin: 0;
  letter-spacing: 2px;
  font-weight: 500;
}

.header-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 30px;
}

.divider-line {
  width: 40px;
  height: 2px;
  background: #000000;
}

.divider-dot {
  width: 8px;
  height: 8px;
  background: #000000;
  border-radius: 50%;
}

.register-form {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.form-section {
  margin-bottom: 35px;
  padding: 25px;
  background: #fafafa;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.form-section:hover {
  background: #f5f5f5;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 25px;
}

.section-number {
  font-size: 28px;
  font-weight: 900;
  color: #000000;
  opacity: 0.3;
  letter-spacing: -2px;
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  color: #000000;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.input-field {
  height: 50px;
  font-size: 15px;
}

:deep(.el-input__wrapper) {
  background: #ffffff;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  box-shadow: none;
  padding: 0 16px;
  transition: all 0.3s ease;
}

:deep(.el-input__wrapper.is-focus) {
  border-color: #000000;
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

:deep(.el-input__prefix) {
  color: #000000;
}

:deep(.el-input__inner) {
  color: #000000;
  font-weight: 500;
}

:deep(.el-input__inner::placeholder) {
  color: #999999;
  font-weight: 400;
}

/* Select 选择器样式 */
.select-field {
  width: 100%;
}

:deep(.el-select .el-input__wrapper) {
  background: #ffffff;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  box-shadow: none;
  padding: 0 16px;
  transition: all 0.3s ease;
}

:deep(.el-select .el-input__wrapper.is-focus) {
  border-color: #000000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

:deep(.el-select .el-input__prefix) {
  color: #000000;
}

:deep(.el-select-dropdown__item.selected) {
  color: #000000;
  font-weight: 700;
}

:deep(.el-select-dropdown__item:hover) {
  background-color: #f5f5f5;
}

:deep(.el-select .el-input.is-disabled .el-input__wrapper) {
  background: #f0f0f0;
  border-color: #e0e0e0;
}

/* 宿舍长选项 */
.dorm-leader-option {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.leader-checkbox {
  width: 100%;
}

.checkbox-text {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #333333;
  font-size: 14px;
  font-weight: 500;
}

.checkbox-text .el-icon {
  color: #000000;
  font-size: 16px;
}

.leader-tip {
  font-size: 12px;
  color: #888888;
  padding-left: 24px;
}

:deep(.el-checkbox__inner) {
  border: 2px solid #d0d0d0;
  width: 18px;
  height: 18px;
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: #000000;
  border-color: #000000;
}

:deep(.el-checkbox__input.is-checked + .el-checkbox__label) {
  color: #000000;
  font-weight: 600;
}

.code-row {
  display: flex;
  gap: 12px;
}

.code-input {
  flex: 1;
}

.code-btn {
  height: 50px;
  min-width: 130px;
  background: #000000;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 1px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.code-btn:hover:not(:disabled) {
  background: #333333;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.code-btn:disabled {
  background: #cccccc;
  color: #999999;
  cursor: not-allowed;
}

.code-btn.btn-active {
  background: #333333;
}

.register-btn {
  width: 100%;
  height: 56px;
  background: #000000;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.register-btn:hover {
  background: #1a1a1a;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.btn-text {
  font-weight: 700;
}

.btn-icon {
  font-size: 18px;
  transition: transform 0.3s ease;
}

.register-btn:hover .btn-icon {
  transform: translateX(4px);
}

.register-footer {
  text-align: center;
  margin-top: 40px;
  padding-top: 30px;
  border-top: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.footer-text {
  font-size: 14px;
  color: #888888;
}

.footer-link {
  font-size: 14px;
  font-weight: 600;
  color: #000000;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.3s ease;
}

.footer-link:hover {
  gap: 10px;
}

.footer-link .el-icon {
  font-size: 16px;
  transition: transform 0.3s ease;
}

.footer-link:hover .el-icon {
  transform: translateX(3px);
}

:deep(.el-form-item) {
  margin-bottom: 16px;
}

:deep(.el-form-item__error) {
  font-size: 12px;
  color: #ff4444;
  padding-top: 6px;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .register-wrapper {
    max-width: 100%;
    padding: 40px 30px;
    border-radius: 16px;
    margin: 20px;
  }

  .brand {
    font-size: 32px;
  }

  .section-number {
    font-size: 24px;
  }

  .code-row {
    flex-direction: column;
  }

  .code-btn {
    width: 100%;
    min-width: auto;
  }
}
</style>