<template>
  <div class="home-container">
    <aside class="sidebar">
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
        </div>
      </header>
      
      <div class="content-wrapper">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, markRaw } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'
import { Monitor, Document, Ticket, Warning, Clock, Setting, User, UserFilled } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const currentLang = computed(() => locale.value)

const toggleLang = () => {
  locale.value = locale.value === 'zh' ? 'en' : 'zh'
}

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const activeMenu = ref('profile')

const userInfo = computed(() => userStore.user)

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
    'profile': t('home.profile')
  }
  return pageNames[route.name] || ''
})

const navItems = computed(() => {
  const role = userStore.user?.role
  const items = []
  
  if (role === 'ADMIN' || role === 'DORM_MANAGER' || role === 'COUNSELOR') {
    items.push({ path: 'dashboard', label: t('home.dashboard'), icon: markRaw(Monitor) })
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
  
  items.push({ path: 'profile', label: t('home.profile'), icon: markRaw(UserFilled) })
  
  return items
})

const navigate = (path) => {
  activeMenu.value = path
  router.push(path)
}

const handleLogout = () => {
  userStore.logout()
  ElMessage.success('Logout successful')
  router.push('/login')
}
</script>

<style scoped>
.home-container {
  display: flex;
  min-height: 100vh;
  background: #f8f8f8;
}

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

.main-content {
  flex: 1;
  margin-left: 260px;
  display: flex;
  flex-direction: column;
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
</style>