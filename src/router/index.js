import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/RegisterStep1.vue')
  },
  {
    path: '/register/step2',
    name: 'RegisterStep2',
    component: () => import('../views/RegisterStep2.vue')
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    redirect: '/profile',
    children: [
      { path: 'dashboard', name: 'Dashboard', component: () => import('../views/Dashboard.vue') },
      { path: 'check-report', name: 'CheckReport', component: () => import('../views/CheckReport.vue') },
      { path: 'leave-apply', name: 'LeaveApply', component: () => import('../views/LeaveApply.vue') },
      { path: 'leave-approve', name: 'LeaveApprove', component: () => import('../views/LeaveApprove.vue') },
      { path: 'hazard-report', name: 'HazardReport', component: () => import('../views/HazardReport.vue') },
      { path: 'hazard-handle', name: 'HazardHandle', component: () => import('../views/HazardHandle.vue') },
      { path: 'records', name: 'Records', component: () => import('../views/Records.vue') },
      { path: 'users', name: 'Users', component: () => import('../views/Users.vue') },
      { path: 'rooms', name: 'Rooms', component: () => import('../views/Rooms.vue') },
      { path: 'config', name: 'Config', component: () => import('../views/Config.vue') },
      { path: 'profile', name: 'Profile', component: () => import('../views/Profile.vue') }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  if ((to.path !== '/login' && to.path !== '/register') && !token) {
    next('/login')
  } else {
    next()
  }
})

export default router