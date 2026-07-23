<template>
  <div class="home-container" :class="{ 'is-mobile': isMobile }">
    <!-- PC端侧边栏 -->
    <aside v-if="!isMobile" class="sidebar">
      <div class="sidebar-brand">
        <div class="brand-icon">N</div>
        <div class="brand-text">
          <span class="brand-name">NDIDRS</span>
          <span class="brand-desc">{{ t('login.tagline') }}</span>
        </div>
      </div>
      
      <nav class="sidebar-nav">
        <div class="nav-section">
          <span class="nav-section-title">MAIN</span>
          <button v-for="item in navItems" :key="item.path" 
                  :class="['nav-item', { active: activeMenu === item.path }]"
                  @click="navigate(item.path)">
            <div class="nav-icon-wrapper">
              <component :is="item.icon" class="nav-icon" />
            </div>
            <span class="nav-text">{{ item.label }}</span>
          </button>
        </div>
      </nav>
      
      <div class="sidebar-footer">
        <button class="logout-btn" @click="handleLogout">
          <div class="logout-icon">⏻</div>
          <span>{{ t('home.logout') }}</span>
        </button>
      </div>
    </aside>
    
    <main class="main-content">
      <header class="top-header">
        <div class="header-left">
          <span class="page-title">{{ currentPageName }}</span>
        </div>
        <div class="header-right">
          <button class="lang-btn" @click="toggleLang">
            {{ currentLang === 'zh' ? 'EN' : '中' }}
          </button>
          <span class="user-info">{{ userInfo?.realName }}</span>
          <button v-if="isMobile" class="logout-icon-btn" @click="handleLogout">⏻</button>
        </div>
      </header>
      
      <div class="content-wrapper">
        <div class="content-inner">
          <router-view />
        </div>
      </div>
    </main>

    <!-- 移动端底部Tab栏 -->
    <nav v-if="isMobile && !isAdmin" class="mobile-tabbar">
      <button
        v-for="item in mobileTabItems"
        :key="item.path"
        :class="['tab-item', { active: activeMenu === item.path }]"
        @click="navigate(item.path)"
      >
        <component :is="item.icon" class="tab-icon" />
        <span class="tab-label">{{ item.label }}</span>
      </button>
      <button class="tab-item" :class="{ active: showMoreMenu }" @click="showMoreMenu = !showMoreMenu">
        <el-icon class="tab-icon"><More /></el-icon>
        <span class="tab-label">更多</span>
      </button>
    </nav>

    <!-- 移动端更多菜单遮罩 -->
    <div v-if="isMobile && showMoreMenu" class="more-overlay" @click="showMoreMenu = false">
      <div class="more-menu" @click.stop>
        <div class="more-menu-header">
          <span>{{ t('home.profile') }}</span>
          <el-icon class="more-close" @click="showMoreMenu = false"><Close /></el-icon>
        </div>
        <div class="more-menu-list">
          <button
            v-for="item in moreMenuItems"
            :key="item.path"
            :class="['more-item', { active: activeMenu === item.path }]"
            @click="navigate(item.path); showMoreMenu = false"
          >
            <component :is="item.icon" class="more-icon" />
            <span>{{ item.label }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 小夜AI悬浮助手 -->
    <XiaoyeFloat v-if="!isAdmin && !isMobile" />
  </div>
</template>

<script setup>
import { ref, computed, markRaw, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'
import { Monitor, Document, Ticket, Warning, Clock, Setting, User, UserFilled, VideoCamera, MagicStick, More, Close } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import XiaoyeFloat from '../components/XiaoyeFloat.vue'

const { t, locale } = useI18n()
const currentLang = computed(() => locale.value)

const toggleLang = () => {
  const newLang = locale.value === 'zh' ? 'en' : 'zh'
  locale.value = newLang
  localStorage.setItem('locale', newLang)
}

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const windowWidth = ref(window.innerWidth)
const isMobile = computed(() => windowWidth.value <= 768)
const isAdmin = computed(() => userStore.user?.role === 'ADMIN')

const updateWidth = () => {
  windowWidth.value = window.innerWidth
}

const activeMenu = ref('profile')
const showMoreMenu = ref(false)

const userInfo = computed(() => userStore.user)

const routeNameToPath = (name) => {
  const map = {
    'Dashboard': 'dashboard',
    'CheckReport': 'check-report',
    'LeaveApply': 'leave-apply',
    'LeaveApprove': 'leave-approve',
    'HazardReport': 'hazard-report',
    'HazardHandle': 'hazard-handle',
    'Records': 'records',
    'Users': 'users',
    'Rooms': 'rooms',
    'Config': 'config',
    'AiAnalysis': 'ai-analysis',
    'Meeting': 'meeting',
    'Profile': 'profile'
  }
  return map[name] || 'dashboard'
}

const updateActiveMenu = () => {
  activeMenu.value = routeNameToPath(route.name)
}

onMounted(() => {
  window.addEventListener('resize', updateWidth)
  updateActiveMenu()
  router.afterEach(updateActiveMenu)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateWidth)
})

const currentPageName = computed(() => {
    const pageNames = {
      'dashboard': t('home.dashboard'),
      'check-report': t('home.checkReport'),
      'leave-apply': t('home.leaveApply'),
      'leave-approve': t('home.leaveApprove'),
      'hazard-report': t('home.hazardReport'),
      'hazard-handle': t('home.hazardHandle'),
      'records': t('home.records'),
      'users': t('home.users'),
      'rooms': t('home.rooms'),
      'config': t('home.config'),
      'ai-analysis': t('home.aiAnalysis'),
      'meeting': t('home.meeting'),
      'profile': t('home.profile')
    }
    return pageNames[routeNameToPath(route.name)] || ''
  })

const navItems = computed(() => {
  const role = userStore.user?.role
  const items = []
  
  if (role === 'ADMIN' || role === 'DORM_MANAGER' || role === 'COUNSELOR') {
    items.push({ path: 'dashboard', label: t('home.dashboard'), icon: markRaw(Monitor) })
    items.push({ path: 'ai-analysis', label: t('home.aiAnalysis'), icon: markRaw(MagicStick) })
  }
  
  if (role === 'DORM_LEADER' || role === 'DORM_MANAGER') {
    items.push({ path: 'check-report', label: t('home.checkReport'), icon: markRaw(Document) })
  }
  
  if (role === 'STUDENT' || role === 'DORM_LEADER') {
    items.push({ path: 'leave-apply', label: t('home.leaveApply'), icon: markRaw(Ticket) })
  }
  
  if (role === 'COUNSELOR') {
    items.push({ path: 'leave-approve', label: t('home.leaveApprove'), icon: markRaw(Ticket) })
  }
  
  if (role === 'STUDENT' || role === 'DORM_LEADER') {
    items.push({ path: 'hazard-report', label: t('home.hazardReport'), icon: markRaw(Warning) })
  }
  
  if (role === 'DORM_MANAGER') {
    items.push({ path: 'hazard-handle', label: t('home.hazardHandle'), icon: markRaw(Warning) })
  }
  
  if (role !== 'STUDENT' && role !== 'DORM_LEADER') {
    items.push({ path: 'records', label: t('home.records'), icon: markRaw(Clock) })
  }
  
  if (role === 'ADMIN' || role === 'COUNSELOR' || role === 'DORM_MANAGER') {
    items.push({ path: 'users', label: t('home.users'), icon: markRaw(User) })
  }
  
  if (role === 'ADMIN') {
    items.push({ path: 'leave-approve', label: t('home.leaveApprove'), icon: markRaw(Ticket) })
    items.push({ path: 'hazard-handle', label: t('home.hazardHandle'), icon: markRaw(Warning) })
    items.push({ path: 'rooms', label: t('home.rooms'), icon: markRaw(Document) })
    items.push({ path: 'config', label: t('home.config'), icon: markRaw(Setting) })
  }

  if (role === 'COUNSELOR' || role === 'DORM_LEADER' || role === 'STUDENT' || role === 'DORM_MANAGER') {
    items.push({ path: 'meeting', label: t('home.meeting'), icon: markRaw(VideoCamera) })
  }

  items.push({ path: 'profile', label: t('home.profile'), icon: markRaw(UserFilled) })

  return items
})

// 移动端Tab栏最多显示4个，其余放"更多"
const mobileTabItems = computed(() => {
  const items = navItems.value
  if (items.length <= 5) return items
  return items.slice(0, 4)
})

const moreMenuItems = computed(() => {
  const items = navItems.value
  if (items.length <= 5) return []
  return items.slice(4)
})

const navigate = (path) => {
  activeMenu.value = path
  router.push(path)
}

const handleLogout = () => {
  userStore.logout()
  ElMessage.success(t('common.success'))
  router.push('/login')
}
</script>

<style scoped>
.home-container {
  display: flex;
  min-height: 100vh;
  background: #f8f8f8;
}

/* === PC端侧边栏 === */
.sidebar {
  width: 260px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  border-right: 1px solid #e8e8e8;
}

.sidebar-brand {
  padding: 32px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.brand-icon {
  width: 48px;
  height: 48px;
  background: #000000;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 900;
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.brand-name {
  font-size: 18px;
  font-weight: 900;
  color: #000000;
  letter-spacing: -0.5px;
}

.brand-desc {
  font-size: 12px;
  color: #888888;
  font-weight: 400;
}

.sidebar-nav {
  flex: 1;
  padding: 24px 0;
  overflow-y: auto;
}

.nav-section {
  padding: 0 16px;
}

.nav-section-title {
  font-size: 11px;
  font-weight: 600;
  color: #888888;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: 16px;
  padding-left: 12px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: none;
  border: none;
  border-radius: 8px;
  color: #666666;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 4px;
  width: 100%;
}

.nav-item:hover {
  color: #000000;
  background: #f5f5f5;
}

.nav-item.active {
  color: #000000;
  background: #f0f0f0;
  font-weight: 600;
}

.nav-icon-wrapper {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  border-radius: 8px;
}

.nav-item.active .nav-icon-wrapper {
  background: #000000;
  color: #ffffff;
}

.nav-icon {
  font-size: 18px;
}

.nav-text {
  letter-spacing: 0.3px;
}

.sidebar-footer {
  padding: 24px 16px;
  border-top: 1px solid #f0f0f0;
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: none;
  border: none;
  border-radius: 8px;
  color: #888888;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
}

.logout-btn:hover {
  color: #e74c3c;
  background: #fef5f5;
}

.logout-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  border-radius: 8px;
  font-size: 16px;
}

.logout-btn:hover .logout-icon {
  background: #fee2e2;
}

/* === 主内容区 === */
.main-content {
  flex: 1;
  margin-left: 260px;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.top-header {
  background: #ffffff;
  padding: 24px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e8e8e8;
}

.header-left {
  font-size: 14px;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: #000000;
  letter-spacing: -0.5px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.lang-btn {
  padding: 8px 16px;
  background: #f5f5f5;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #000000;
  cursor: pointer;
  transition: all 0.2s ease;
}

.lang-btn:hover {
  background: #e8e8e8;
}

.user-info {
  font-size: 14px;
  color: #333333;
  font-weight: 500;
}

.content-wrapper {
  flex: 1;
  padding: 40px;
  overflow-y: auto;
}

/* PC端内容居中 */
.content-inner {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

/* === 移动端底部Tab栏 === */
.mobile-tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: #ffffff;
  display: flex;
  border-top: 1px solid #e8e8e8;
  z-index: 1000;
  padding-bottom: env(safe-area-inset-bottom);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  background: none;
  border: none;
  color: #999999;
  cursor: pointer;
  transition: color 0.2s ease;
  padding: 4px 0;
}

.tab-item.active {
  color: #000000;
}

.tab-icon {
  font-size: 20px;
}

.tab-label {
  font-size: 10px;
  font-weight: 500;
}

.logout-icon-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: #888888;
  cursor: pointer;
  padding: 4px 8px;
}

/* === 移动端响应式 === */
.home-container.is-mobile .main-content {
  margin-left: 0;
}

.home-container.is-mobile .top-header {
  padding: 16px 16px;
}

.home-container.is-mobile .page-title {
  font-size: 17px;
}

.home-container.is-mobile .header-right {
  gap: 12px;
}

.home-container.is-mobile .header-right .user-info {
  display: none;
}

.home-container.is-mobile .content-wrapper {
  padding: 16px;
  padding-bottom: 72px;
}

/* === 更多菜单 === */
.more-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 2000;
  display: flex;
  align-items: flex-end;
}

.more-menu {
  width: 100%;
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding: 20px 16px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
  max-height: 70vh;
  overflow-y: auto;
}

.more-menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 600;
  color: #222;
}

.more-close {
  font-size: 20px;
  color: #888;
  cursor: pointer;
}

.more-menu-list {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.more-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 4px;
  background: none;
  border: none;
  border-radius: 10px;
  color: #555;
  font-size: 12px;
  cursor: pointer;
}

.more-item:active {
  background: #f0f0f0;
}

.more-item.active {
  color: #000;
  background: #f0f0f0;
}

.more-icon {
  font-size: 22px;
}
</style>
