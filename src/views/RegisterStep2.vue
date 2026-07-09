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
        <div class="step-tab done">
          <span class="step-num">01</span>
          <span class="step-label">{{ t('register.basicInfo') }}</span>
        </div>
        <div class="step-tab active">
          <span class="step-num">02</span>
          <span class="step-label">{{ t('register.detailInfo') }}</span>
        </div>
      </div>

      <el-form ref="registerForm" :model="form" :rules="rules" class="register-form">
        <el-form-item prop="realName">
          <el-input v-model="form.realName" :placeholder="t('register.realName')" class="input-field" autocomplete="off" />
        </el-form-item>

        <el-form-item prop="phone">
          <el-input v-model="form.phone" :placeholder="t('register.phone')" class="input-field" autocomplete="off" />
        </el-form-item>

        <el-form-item prop="college">
          <el-select v-model="form.college" :placeholder="t('register.pleaseSelectCollege')" class="select-field" @change="handleCollegeChange" autocomplete="off">
            <el-option v-for="item in collegeList" :key="item.id" :label="item.collegeName" :value="item.collegeName" />
          </el-select>
        </el-form-item>

        <el-form-item prop="classId">
          <el-select v-model="form.classId" :placeholder="t('register.pleaseSelectClass')" class="select-field" :disabled="!form.college" @change="handleClassChange" autocomplete="off">
            <el-option v-for="item in classList" :key="item.id" :label="item.grade + ' ' + item.className" :value="item.id" />
          </el-select>
        </el-form-item>

        <el-form-item prop="building">
          <el-select v-model="form.building" :placeholder="t('register.pleaseSelectBuilding')" class="select-field" @change="handleBuildingChange" autocomplete="off">
            <el-option v-for="item in buildingList" :key="item.id" :label="item.buildingName" :value="item.buildingName" />
          </el-select>
        </el-form-item>

        <el-form-item prop="room">
          <el-select v-model="form.room" :placeholder="t('register.pleaseSelectRoom')" class="select-field" :disabled="!form.building" autocomplete="off">
            <el-option v-for="item in roomList" :key="item.id" :label="item.roomNumber" :value="item.roomNumber" />
          </el-select>
        </el-form-item>

        <el-form-item prop="isDormLeader">
          <div class="dorm-leader-row">
            <el-checkbox v-model="form.isDormLeader">
              <span class="checkbox-label">{{ t('register.dormLeader') }}</span>
            </el-checkbox>
            <span class="leader-tip" v-if="form.isDormLeader">{{ t('register.dormLeaderTip') }}</span>
          </div>
        </el-form-item>

        <div class="btn-group">
          <el-button class="back-btn" @click="goBack">
            {{ t('register.back') }}
          </el-button>
          <el-button class="submit-btn" @click="handleStep2" :loading="loading">
            {{ t('register.finish') }}
          </el-button>
        </div>
      </el-form>

      <div class="register-footer">
        <span>{{ t('register.haveAccount') }}</span>
        <span class="login-link" @click="goToLogin">{{ t('register.login') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
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

const collegeList = ref([])
const classList = ref([])
const buildingList = ref([])
const roomList = ref([])

const form = reactive({
  realName: '',
  phone: '',
  college: '',
  classId: null,
  className: '',
  grade: '',
  building: '',
  room: '',
  isDormLeader: false
})

const rules = {
  realName: [{ required: true, message: t('common.required'), trigger: 'blur' }],
  phone: [
    { required: true, message: t('common.required'), trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: t('register.phoneFormat'), trigger: 'blur' }
  ],
  college: [{ required: true, message: t('common.required'), trigger: 'change' }],
  classId: [{ required: true, message: t('common.required'), trigger: 'change' }],
  building: [{ required: true, message: t('common.required'), trigger: 'change' }],
  room: [{ required: true, message: t('common.required'), trigger: 'change' }]
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

onMounted(() => {
  const userId = localStorage.getItem('registerUserId')
  if (!userId) {
    ElMessage.warning(t('register.pleaseCompleteStep1'))
    router.push('/register')
    return
  }
  loadColleges()
  loadBuildings()
})

const handleStep2 = async () => {
  if (!registerForm.value) return

  try {
    await registerForm.value.validate()
  } catch {
    return
  }

  const userId = localStorage.getItem('registerUserId')
  if (!userId) {
    ElMessage.warning(t('register.pleaseCompleteStep1'))
    router.push('/register')
    return
  }

  loading.value = true
  try {
    const res = await request.post('/register/step2', {
      userId: parseInt(userId),
      realName: form.realName,
      phone: form.phone,
      college: form.college,
      className: form.className,
      grade: form.grade,
      building: form.building,
      room: form.room,
      isDormLeader: form.isDormLeader
    })
    if (res.code === 200) {
      ElMessage.success(t('register.registerSuccess'))
      localStorage.removeItem('registerUserId')
      localStorage.removeItem('registerUsername')
      router.push('/login')
    } else {
      ElMessage.error(res.message)
    }
  } catch (error) {
    ElMessage.error(t('register.registerFailed'))
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push('/register')
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

.step-tab.done .step-num {
  color: #666666;
}

.step-tab.done .step-label {
  color: #666666;
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

.select-field {
  width: 100%;
}

.select-field :deep(.el-select__wrapper) {
  border-radius: 0;
  border: none;
  border-bottom: 2px solid #e5e5e5;
  box-shadow: none;
  padding: 8px 0;
  font-size: 16px;
  background: transparent;
}

.select-field :deep(.el-select__wrapper:hover),
.select-field :deep(.el-select__wrapper.is-focused) {
  border-bottom-color: #000000;
}

.select-field :deep(.el-select__placeholder) {
  color: #a8abb2;
}

.dorm-leader-row {
  padding: 12px 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.checkbox-label {
  font-size: 14px;
  color: #333333;
}

.leader-tip {
  font-size: 12px;
  color: #888888;
  padding-left: 24px;
}

:deep(.el-checkbox__inner) {
  border: 2px solid #d0d0d0;
  width: 16px;
  height: 16px;
  border-radius: 0;
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: #000000;
  border-color: #000000;
}

.btn-group {
  display: flex;
  gap: 16px;
  margin-top: 8px;
}

.back-btn {
  flex: 1;
  height: 56px;
  border-radius: 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 2px;
  background: transparent;
  color: #666666;
  border: 1px solid #e5e5e5;
  text-transform: uppercase;
  transition: all 0.3s ease;
}

.back-btn:hover {
  color: #000000;
  border-color: #000000;
}

.submit-btn {
  flex: 2;
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

  .btn-group {
    flex-direction: column;
  }

  .back-btn, .submit-btn {
    width: 100%;
    flex: none;
  }
}
</style>
