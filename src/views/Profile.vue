<template>
  <div class="profile-page">
    <div class="profile-card">
      <h2 class="page-title">{{ t('profile.title') }}</h2>
      
      <div class="profile-header">
        <div class="avatar-wrapper">
          <img v-if="form.avatar" :src="form.avatar" class="avatar-img" alt="avatar" />
          <div v-else class="avatar-circle">{{ userInfo?.realName?.charAt(0) || 'U' }}</div>
          <input type="file" id="avatar-input" accept="image/*" class="avatar-input" @change="handleAvatarChange" />
          <label for="avatar-input" class="avatar-upload-btn">
            <el-icon><Camera /></el-icon>
          </label>
        </div>
      </div>
      
      <el-form :model="form" label-width="100px" class="profile-form">
        <el-form-item :label="t('profile.username')">
          <span class="form-text">{{ form.username }}</span>
        </el-form-item>
        <el-form-item :label="t('profile.realName')">
          <span class="form-text">{{ form.realName }}</span>
        </el-form-item>
        <el-form-item :label="t('profile.role')">
          <span class="form-text">{{ getRoleText(form.role) }}</span>
        </el-form-item>
        <el-form-item v-if="form.className" :label="t('profile.className')">
          <span class="form-text">{{ form.className }}</span>
        </el-form-item>
        <el-form-item v-if="form.building" :label="t('profile.building')">
          <span class="form-text">{{ form.building }}</span>
        </el-form-item>
        <el-form-item v-if="form.room" :label="t('profile.room')">
          <span class="form-text">{{ form.room }}</span>
        </el-form-item>
        <el-form-item v-if="form.college" :label="form.role === 'ADMIN' ? t('profile.department') : t('profile.college')">
          <span class="form-text">{{ form.college }}</span>
        </el-form-item>
        <el-form-item :label="t('profile.phone')">
          <el-input v-model="form.phone" :placeholder="t('profile.phonePlaceholder')" />
        </el-form-item>
      </el-form>
      
      <div class="form-actions">
        <el-button type="primary" @click="handleUpdateProfile">{{ t('profile.update') }}</el-button>
      </div>
    </div>
    
    <div class="password-card">
      <h3 class="section-title">{{ t('profile.changePassword') }}</h3>
      
      <el-form :model="passwordForm" label-width="100px" class="password-form">
        <el-form-item :label="t('profile.oldPassword')">
          <el-input v-model="passwordForm.oldPassword" type="password" show-password :placeholder="t('profile.oldPasswordPlaceholder')" />
        </el-form-item>
        <el-form-item :label="t('profile.newPassword')">
          <el-input v-model="passwordForm.newPassword" type="password" show-password :placeholder="t('profile.newPasswordPlaceholder')" />
        </el-form-item>
        <el-form-item :label="t('profile.confirmPassword')">
          <el-input v-model="passwordForm.confirmPassword" type="password" show-password :placeholder="t('profile.confirmPasswordPlaceholder')" />
        </el-form-item>
      </el-form>
      
      <div class="form-actions">
        <el-button type="primary" @click="handleChangePassword">{{ t('profile.confirmChange') }}</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '../stores/user'
import { ElMessage, ElIcon } from 'element-plus'
import { Camera } from '@element-plus/icons-vue'
import request from '../utils/request'

const { t } = useI18n()
const userStore = useUserStore()

const userInfo = computed(() => userStore.user)

const form = ref({
  id: null,
  username: '',
  realName: '',
  role: '',
  className: '',
  building: '',
  room: '',
  college: '',
  phone: '',
  avatar: ''
})

const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const getRoleText = (role) => {
  const roleMap = {
    'STUDENT': t('role.student'),
    'DORM_LEADER': t('role.dormLeader'),
    'DORM_MANAGER': t('role.dormManager'),
    'COUNSELOR': t('role.counselor'),
    'ADMIN': t('role.admin')
  }
  return roleMap[role] || role
}

const loadUserInfo = () => {
  const user = userStore.user
  if (user) {
    form.value = {
      id: user.id,
      username: user.username,
      realName: user.realName,
      role: user.role,
      className: user.className || '',
      building: user.building || '',
      room: user.room || '',
      college: user.college || '',
      phone: user.phone || '',
      avatar: user.avatar || ''
    }
  }
}

const handleAvatarChange = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  const formData = new FormData()
  formData.append('file', file)
  
  try {
    console.log('上传头像，用户ID:', form.value.id)
    const res = await request.post(`/users/${form.value.id}/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    console.log('上传响应:', res)
    if (res.code === 200) {
      form.value.avatar = res.data.url
      userStore.setUser({ ...userStore.user, avatar: res.data.url })
      ElMessage.success(t('profile.avatarUploadSuccess'))
    } else {
      console.error('上传失败:', res.message)
      ElMessage.error(res.message || t('profile.avatarUploadFailed'))
    }
  } catch (error) {
    console.error('上传异常:', error)
    ElMessage.error(t('profile.avatarUploadFailed'))
  }
}

const handleUpdateProfile = async () => {
  try {
    const res = await request.put('/users', form.value)
    if (res.code === 200) {
      ElMessage.success(t('profile.updateSuccess'))
      userStore.setUser(form.value)
    }
  } catch (error) {
    ElMessage.error(t('profile.updateFailed'))
  }
}

const handleChangePassword = async () => {
  if (!passwordForm.value.oldPassword) {
    ElMessage.warning(t('profile.enterOldPassword'))
    return
  }
  if (!passwordForm.value.newPassword) {
    ElMessage.warning(t('profile.enterNewPassword'))
    return
  }
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    ElMessage.warning(t('profile.passwordNotMatch'))
    return
  }
  
  try {
    const res = await request.post(`/users/${form.value.id}/password`, passwordForm.value)
    if (res.code === 200) {
      ElMessage.success(t('profile.passwordChangeSuccess'))
      passwordForm.value = {
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      }
    }
  } catch (error) {
    ElMessage.error(t('profile.passwordChangeFailed'))
  }
}

onMounted(() => {
  loadUserInfo()
})
</script>

<style scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 40px 20px;
}

.profile-card,
.password-card {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8e8e8;
  padding: 32px;
  width: 100%;
  max-width: 500px;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: #000000;
  margin: 0 0 24px;
  text-align: center;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #000000;
  margin: 0 0 20px;
}

.profile-header {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.avatar-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.avatar-circle {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: #000000;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  font-weight: 700;
}

.avatar-img {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #e0e0e0;
}

.avatar-input {
  display: none;
}

.avatar-upload-btn {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #000000;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  border: 2px solid #ffffff;
}

.avatar-upload-btn:hover {
  background: #333333;
}

.profile-form,
.password-form {
  width: 100%;
}

.form-text {
  color: #333333;
  font-size: 14px;
}

.form-actions {
  text-align: center;
  margin-top: 16px;
}

:deep(.el-button--primary) {
  background: #000000;
  border-color: #000000;
}

:deep(.el-button--primary:hover) {
  background: #333333;
  border-color: #333333;
}

@media (max-width: 768px) {
  .profile-page {
    padding: 16px 12px;
    gap: 16px;
  }

  .profile-card,
  .password-card {
    padding: 16px;
    max-width: 100%;
  }

  .page-title {
    font-size: 18px;
    margin-bottom: 16px;
  }

  .section-title {
    font-size: 15px;
    margin-bottom: 14px;
  }

  .profile-header {
    margin-bottom: 16px;
  }

  .avatar-circle,
  .avatar-img {
    width: 72px;
    height: 72px;
    font-size: 30px;
  }

  .avatar-upload-btn {
    width: 26px;
    height: 26px;
    font-size: 12px;
  }

  .profile-form,
  .password-form {
    width: 100%;
  }

  :deep(.el-form-item) {
    margin-bottom: 14px;
  }

  :deep(.el-form-item__label) {
    font-size: 13px;
    padding-right: 8px;
  }

  .form-text {
    font-size: 13px;
  }

  .form-actions {
    margin-top: 12px;
  }

  :deep(.el-button) {
    width: 100%;
  }
}
</style>
