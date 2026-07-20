<template>
  <div class="login-container">
    <div class="lang-switch" @click="toggleLang">
      <span>{{ currentLang === 'zh' ? 'English' : '中文' }}</span>
    </div>
    <div class="login-wrapper">
      <div class="login-header">
        <h1 class="brand">{{ t('login.brand') }}</h1>
        <p class="tagline">{{ t('login.tagline') }}</p>
      </div>

      <div class="role-tabs">
        <div
          v-for="tab in roleTabs"
          :key="tab.value"
          class="role-tab"
          :class="{ active: activeRole === tab.value }"
          @click="switchRole(tab.value)"
        >
          {{ t(tab.label) }}
        </div>
      </div>

      <el-form ref="loginForm" :model="form" :rules="rules" class="login-form">
        <template v-if="activeRole === 'student' || activeRole === 'admin'">
          <el-form-item prop="username">
            <el-input v-model="form.username" :placeholder="t('login.username')" prefix-icon="User" class="input-field" autocomplete="off" />
          </el-form-item>
          <el-form-item prop="password">
            <el-input v-model="form.password" type="password" :placeholder="t('login.password')" prefix-icon="Lock" class="input-field" show-password autocomplete="new-password" />
          </el-form-item>
        </template>

        <template v-else-if="activeRole === 'counselor'">
          <el-form-item prop="college">
            <el-select v-model="selectedCollege" :placeholder="t('login.selectCollege')" class="select-field" @change="onCollegeChange" autocomplete="off">
              <el-option
                v-for="c in colleges"
                :key="c.id"
                :label="c.collegeName"
                :value="c.collegeName"
              />
            </el-select>
          </el-form-item>
          <el-form-item prop="classId">
            <el-select v-model="selectedClass" :placeholder="t('login.selectClass')" class="select-field" @change="onClassChange" autocomplete="off">
              <el-option
                v-for="cl in classList"
                :key="cl.id"
                :label="`${cl.grade} ${cl.className}`"
                :value="`${cl.collegeName}${cl.grade}${cl.className}counselor`"
              />
            </el-select>
          </el-form-item>
          <el-form-item prop="password">
            <el-input v-model="form.password" type="password" :placeholder="t('login.password')" prefix-icon="Lock" class="input-field" show-password autocomplete="new-password" />
          </el-form-item>
        </template>

        <template v-else-if="activeRole === 'manager'">
          <el-form-item prop="building">
            <el-select v-model="selectedBuilding" :placeholder="t('login.selectBuilding')" class="select-field" @change="onBuildingChange" autocomplete="off">
              <el-option
                v-for="b in buildings"
                :key="b.id"
                :label="b.buildingName"
                :value="`${b.buildingName}manager`"
              />
            </el-select>
          </el-form-item>
          <el-form-item prop="password">
            <el-input v-model="form.password" type="password" :placeholder="t('login.password')" prefix-icon="Lock" class="input-field" show-password autocomplete="new-password" />
          </el-form-item>
        </template>

        <el-form-item>
          <el-button class="login-btn" @click="handleLogin" :loading="loading">{{ t('login.login') }}</el-button>
        </el-form-item>
      </el-form>

      <div class="login-footer">
        <div class="register-link">
          <span>{{ t('login.noAccount') }}</span>
          <span @click="goToRegister">{{ t('login.register') }}</span>
        </div>
        <p>{{ t('login.footer') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import request from '../utils/request'

const { t, locale } = useI18n()
const currentLang = computed(() => locale.value)

const toggleLang = () => {
  locale.value = locale.value === 'zh' ? 'en' : 'zh'
}

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)

const form = reactive({
  username: '',
  password: '123456'
})
const rules = {
  username: [{ required: true, message: t('common.required'), trigger: 'blur' }],
  password: [{ required: true, message: t('common.required'), trigger: 'blur' }]
}

const roleTabs = [
  { value: 'student', label: 'login.studentLeader' },
  { value: 'counselor', label: 'login.counselor' },
  { value: 'manager', label: 'login.manager' },
  { value: 'admin', label: 'login.admin' }
]

const activeRole = ref('student')
const colleges = ref([])
const classList = ref([])
const buildings = ref([])
const selectedCollege = ref('')
const selectedClass = ref('')
const selectedBuilding = ref('')

const switchRole = (role) => {
  activeRole.value = role
  form.username = ''
  form.password = '123456'
  selectedCollege.value = ''
  selectedClass.value = ''
  selectedBuilding.value = ''
}

const onCollegeChange = (val) => {
  selectedClass.value = ''
  form.username = ''
  if (val) {
    loadClasses(val)
  } else {
    classList.value = []
  }
}

const onClassChange = (val) => {
  if (val) {
    form.username = val
  } else {
    form.username = ''
  }
}

const onBuildingChange = (val) => {
  if (val) {
    form.username = val
  } else {
    form.username = ''
  }
}

const loadColleges = async () => {
  try {
    const res = await request.get('/dict/colleges')
    if (res.code === 200) {
      colleges.value = res.data || []
    }
  } catch (e) {
    console.error('加载学院列表失败', e)
  }
}

const loadClasses = async (collegeName) => {
  try {
    const res = await request.get('/dict/classes', { params: { collegeName } })
    if (res.code === 200) {
      classList.value = res.data || []
    }
  } catch (e) {
    console.error('加载班级列表失败', e)
  }
}

const loadBuildings = async () => {
  try {
    const res = await request.get('/dict/buildings')
    if (res.code === 200) {
      buildings.value = res.data || []
    }
  } catch (e) {
    console.error('加载楼栋列表失败', e)
  }
}

const handleLogin = async () => {
  if (activeRole.value === 'counselor' && !form.username) {
    ElMessage.warning(t('common.pleaseSelect') + t('login.selectClass'))
    return
  }
  if (activeRole.value === 'manager' && !form.username) {
    ElMessage.warning(t('common.pleaseSelect') + t('login.selectBuilding'))
    return
  }
  if (!form.username || !form.password) {
    ElMessage.warning(t('common.required'))
    return
  }
  loading.value = true
  try {
    const expectedRole = activeRole.value === 'student' ? null :
                         activeRole.value === 'admin' ? 'ADMIN' :
                         activeRole.value === 'counselor' ? 'COUNSELOR' : 'DORM_MANAGER'
    const res = await userStore.login(form.username, form.password, expectedRole)
    if (res.code === 200) {
      ElMessage.success(t('login.success'))
      const role = userStore.user?.role
      if (role === 'ADMIN' || role === 'DORM_MANAGER' || role === 'COUNSELOR') {
        router.push('/dashboard')
      } else if (role === 'DORM_LEADER') {
        router.push('/check-report')
      } else {
        router.push('/leave-apply')
      }
    } else {
      ElMessage.error(res.message)
    }
  } catch (error) {
    ElMessage.error(t('login.error'))
  } finally {
    loading.value = false
  }
}

const goToRegister = () => {
  router.push('/register')
}

onMounted(() => {
  loadColleges()
  loadBuildings()
})
</script>

<style scoped>
.login-container {
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

.login-wrapper {
  width: 520px;
  padding: 60px 60px;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.login-header {
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

.role-tabs {
  display: flex;
  border-bottom: 2px solid #f0f0f0;
  margin-bottom: 36px;
}

.role-tab {
  flex: 1;
  padding: 14px 0;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  color: #999999;
  cursor: pointer;
  transition: all 0.25s ease;
  position: relative;
}

.role-tab:hover {
  color: #333333;
}

.role-tab.active {
  color: #000000;
  font-weight: 700;
}

.role-tab.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 40%;
  height: 2px;
  background: #000000;
}

.login-form {
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
}

.select-field :deep(.el-select__wrapper:hover),
.select-field :deep(.el-select__wrapper.is-focused) {
  border-bottom-color: #000000;
}

.login-btn {
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

.login-btn:hover {
  background: #333333;
}

.login-btn:active {
  background: #000000;
}

.login-footer {
  text-align: center;
  font-size: 14px;
  color: #aaaaaa;
}

.login-footer p {
  margin: 8px 0;
}

.register-link {
  margin-bottom: 12px;
  font-size: 13px;
}

.register-link span:last-child {
  color: #000000;
  font-weight: 600;
  cursor: pointer;
  margin-left: 4px;
}

.register-link span:last-child:hover {
  text-decoration: underline;
}

/* === 移动端响应式 === */
@media (max-width: 768px) {
  .login-container {
    padding: 20px;
  }

  .lang-switch {
    top: 20px;
    right: 20px;
    padding: 6px 12px;
    font-size: 12px;
  }

  .login-wrapper {
    width: 100%;
    padding: 20px;
  }

  .brand {
    font-size: 36px;
  }

  .tagline {
    font-size: 12px;
  }

  .login-header {
    margin-bottom: 28px;
  }

  .role-tab {
    font-size: 13px;
    padding: 12px 0;
  }

  .input-field {
    font-size: 14px;
    padding: 16px 0;
  }

  .login-btn {
    height: 48px;
    font-size: 14px;
  }
}
</style>
