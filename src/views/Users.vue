<template>
  <div class="users">
    <h2>{{ t('users.title') }}</h2>
    
    <div class="users-table">
      <div class="table-header">
        <span>{{ t('users.username') }}</span>
        <span>{{ t('users.realName') }}</span>
        <span>{{ t('users.role') }}</span>
        <span>年级</span>
        <span>班级</span>
        <span>楼栋</span>
        <span>宿舍</span>
        <span>学院</span>
        <span>{{ t('users.status') }}</span>
      </div>
      <div v-for="user in users" :key="user.id" class="table-row">
        <span>{{ user.username }}</span>
        <span>{{ user.realName }}</span>
        <span>{{ getRoleText(user.role) }}</span>
        <span>{{ user.grade || '-' }}</span>
        <span>{{ user.className || '-' }}</span>
        <span>{{ user.building || '-' }}</span>
        <span>{{ user.room || '-' }}</span>
        <span>{{ user.college || '-' }}</span>
        <span class="status-tag" :class="user.status === 1 ? 'active' : 'inactive'">
          {{ user.status === 1 ? t('users.enabled') : t('users.disabled') }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import request from '../utils/request'
import { ElMessage } from 'element-plus'

const { t } = useI18n()

const users = ref([])

const loadUsers = async () => {
  try {
    const res = await request.get('/users', {
      params: { pageNum: 1, pageSize: 100 }
    })
    if (res.code === 200 && res.data) {
      users.value = res.data.records.map(u => ({
        id: u.id,
        username: u.username || u.user_name,
        realName: u.realName || u.real_name,
        role: u.role,
        grade: u.grade,
        className: u.className || u.class_name,
        building: u.building,
        room: u.room,
        college: u.college,
        status: u.status
      }))
    }
  } catch (error) {
    console.error('加载用户列表失败:', error)
    ElMessage.error(t('common.error'))
  }
}

onMounted(() => {
  loadUsers()
})

const getRoleText = (role) => {
  const texts = {
    STUDENT: t('users.student'),
    DORM_LEADER: '寝室长',
    DORM_MANAGER: '宿管员',
    COUNSELOR: '辅导员',
    ADMIN: t('users.admin')
  }
  return texts[role] || role
}
</script>

<style scoped>
.users {
  padding: 32px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8e8e8;
}

.users h2 {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 20px;
  color: #000000;
}

.users-table {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e8e8e8;
}

.table-header {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr 0.8fr 1fr 0.8fr 0.8fr 1fr 0.8fr;
  padding: 16px 24px;
  background: #f8f8f8;
  font-size: 12px;
  font-weight: 600;
  color: #888888;
}

.table-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr 0.8fr 1fr 0.8fr 0.8fr 1fr 0.8fr;
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
  color: #333333;
}

.table-row:last-child {
  border-bottom: none;
}

.status-tag {
  display: inline-block;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
}

.status-tag.active {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-tag.inactive {
  background: #ffebee;
  color: #c62828;
}

@media (max-width: 768px) {
  .users {
    padding: 16px;
  }

  .users h2 {
    font-size: 18px;
    margin-bottom: 14px;
  }

  .users-table {
    border: none;
    border-radius: 0;
    overflow: visible;
  }

  .table-header {
    display: none;
  }

  .table-row {
    grid-template-columns: 1fr;
    gap: 6px;
    padding: 14px 12px;
    border: 1px solid #f0f0f0;
    border-radius: 8px;
    margin-bottom: 10px;
    font-size: 13px;
    background: #fafafa;
  }

  .table-row span {
    display: block;
    word-break: break-all;
  }

  .status-tag {
    font-size: 11px;
    padding: 3px 10px;
    width: fit-content;
  }
}
</style>