<template>
  <div class="users-page">
    <div class="page-heading">
      <div>
        <h2>{{ t('users.title') }}</h2>
        <p>{{ t('users.pageDesc') }}</p>
      </div>
      <el-button @click="loadUsers">{{ t('users.refresh') }}</el-button>
    </div>

    <div class="filter-panel">
      <el-input
        v-model="filters.keyword"
        class="keyword-input"
        clearable
        :placeholder="t('users.searchPlaceholder')"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />
      <el-select v-model="filters.className" clearable filterable :placeholder="t('users.allClasses')">
        <el-option
          v-for="classItem in classOptions"
          :key="classItem"
          :label="classItem"
          :value="classItem"
        />
      </el-select>
      <el-select v-model="filters.role" clearable :placeholder="t('users.allRoles')">
        <el-option
          v-for="role in roleOptions"
          :key="role.value"
          :label="role.label"
          :value="role.value"
        />
      </el-select>
      <el-select v-model="filters.status" clearable :placeholder="t('users.allStatus')">
        <el-option :label="t('users.statusEnabled')" :value="1" />
        <el-option :label="t('users.statusDisabled')" :value="0" />
      </el-select>
      <div class="filter-actions">
        <el-button type="primary" @click="handleSearch">{{ t('users.search') }}</el-button>
        <el-button @click="resetFilters">{{ t('users.reset') }}</el-button>
      </div>
    </div>

    <div v-if="canManage" class="batch-toolbar">
      <span>{{ t('users.selected', { n: selectedUsers.length }) }}</span>
      <div>
        <el-button
          type="success"
          plain
          :disabled="selectedUsers.length === 0"
          @click="changeBatchStatus(1)"
        >
          {{ t('users.batchEnable') }}
        </el-button>
        <el-button
          type="danger"
          plain
          :disabled="selectedUsers.length === 0"
          @click="changeBatchStatus(0)"
        >
          {{ t('users.batchDisable') }}
        </el-button>
      </div>
    </div>

    <el-table
      ref="tableRef"
      v-loading="loading"
      :data="users"
      row-key="id"
      :empty-text="t('users.noUsers')"
      @selection-change="handleSelectionChange"
    >
      <el-table-column v-if="canManage" type="selection" width="48" :selectable="canSelectRow" />
      <el-table-column prop="username" :label="t('users.username')" min-width="130" show-overflow-tooltip />
      <el-table-column prop="realName" :label="t('users.realName')" min-width="100">
        <template #default="scope">{{ scope.row.realName || '-' }}</template>
      </el-table-column>
      <el-table-column :label="t('users.role')" min-width="100">
        <template #default="scope">{{ getRoleText(scope.row.role) }}</template>
      </el-table-column>
      <el-table-column prop="grade" :label="t('users.grade')" min-width="90">
        <template #default="scope">{{ scope.row.grade || '-' }}</template>
      </el-table-column>
      <el-table-column prop="className" :label="t('users.className')" min-width="130" show-overflow-tooltip>
        <template #default="scope">{{ scope.row.className || '-' }}</template>
      </el-table-column>
      <el-table-column prop="building" :label="t('users.building')" min-width="90">
        <template #default="scope">{{ scope.row.building || '-' }}</template>
      </el-table-column>
      <el-table-column prop="room" :label="t('users.room')" min-width="90">
        <template #default="scope">{{ scope.row.room || '-' }}</template>
      </el-table-column>
      <el-table-column prop="college" :label="t('users.college')" min-width="150" show-overflow-tooltip>
        <template #default="scope">{{ scope.row.college || '-' }}</template>
      </el-table-column>
      <el-table-column :label="t('users.status')" width="90" align="center">
        <template #default="scope">
          <el-tag :type="scope.row.status === 1 ? 'success' : 'info'" effect="light">
            {{ scope.row.status === 1 ? t('users.statusEnabled') : t('users.statusDisabled') }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column v-if="canManage" :label="t('users.actions')" fixed="right" width="190" align="center">
        <template #default="scope">
          <el-button link type="primary" @click="openResetPassword(scope.row)">{{ t('users.resetPassword') }}</el-button>
          <el-button
            link
            :type="scope.row.status === 1 ? 'danger' : 'success'"
            :disabled="!canToggleStatus(scope.row)"
            @click="changeUserStatus(scope.row)"
          >
            {{ scope.row.status === 1 ? t('users.disableUser') : t('users.enableUser') }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrap">
      <span>{{ t('users.totalCount', { n: total }) }}</span>
      <el-pagination
        v-model:current-page="pagination.pageNum"
        v-model:page-size="pagination.pageSize"
        background
        :page-sizes="[10, 20, 50, 100]"
        layout="sizes, prev, pager, next, jumper"
        :total="total"
        @size-change="handleSizeChange"
        @current-change="loadUsers"
      />
    </div>

    <el-dialog v-model="resetDialog.visible" :title="t('users.resetPasswordTitle')" width="420px" destroy-on-close>
      <p class="dialog-tip">
        {{ t('users.resetPasswordFor') }} <strong>{{ resetDialog.user?.realName || resetDialog.user?.username }}</strong> {{ t('users.resetPasswordForSuffix') }}
      </p>
      <el-form ref="passwordFormRef" :model="passwordForm" :rules="passwordRules" label-width="90px">
        <el-form-item :label="t('users.newPassword')" prop="newPassword">
          <el-input
            v-model="passwordForm.newPassword"
            type="password"
            show-password
            autocomplete="new-password"
            :placeholder="t('users.newPasswordPlaceholder')"
          />
        </el-form-item>
        <el-form-item :label="t('users.confirmPassword')" prop="confirmPassword">
          <el-input
            v-model="passwordForm.confirmPassword"
            type="password"
            show-password
            autocomplete="new-password"
            :placeholder="t('users.confirmPasswordPlaceholder')"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetDialog.visible = false">{{ t('users.cancelBtn') }}</el-button>
        <el-button type="primary" :loading="resetDialog.submitting" @click="submitResetPassword">
          {{ t('users.confirmReset') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../utils/request'
import { useUserStore } from '../stores/user'

const { t } = useI18n()
const userStore = useUserStore()

const users = ref([])
const total = ref(0)
const loading = ref(false)
const selectedUsers = ref([])
const classOptions = ref([])
const tableRef = ref(null)
const passwordFormRef = ref(null)

const filters = reactive({
  keyword: '',
  className: '',
  role: '',
  status: null
})

const pagination = reactive({
  pageNum: 1,
  pageSize: 10
})

const resetDialog = reactive({
  visible: false,
  submitting: false,
  user: null
})

const passwordForm = reactive({
  newPassword: '',
  confirmPassword: ''
})

const validateConfirmPassword = (_rule, value, callback) => {
  if (!value) callback(new Error(t('users.enterConfirmPassword')))
  else if (value !== passwordForm.newPassword) callback(new Error(t('users.passwordNotMatch')))
  else callback()
}

const passwordRules = computed(() => ({
  newPassword: [
    { required: true, message: t('users.enterNewPassword'), trigger: 'blur' },
    { min: 6, max: 64, message: t('users.passwordLengthError'), trigger: 'blur' }
  ],
  confirmPassword: [{ validator: validateConfirmPassword, trigger: 'blur' }]
}))

const roleOptions = computed(() => [
  { value: 'STUDENT', label: t('role.student') },
  { value: 'DORM_LEADER', label: t('role.dormLeader') },
  { value: 'DORM_MANAGER', label: t('role.dormManager') },
  { value: 'COUNSELOR', label: t('role.counselor') },
  { value: 'ADMIN', label: t('role.admin') }
])

const canManage = computed(() => ['ADMIN', 'DORM_MANAGER'].includes(userStore.user?.role))

const normalizeUser = (user) => ({
  ...user,
  username: user.username || user.user_name,
  realName: user.realName || user.real_name,
  className: user.className || user.class_name
})

const getErrorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback

const loadUsers = async () => {
  loading.value = true
  try {
    const params = {
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize
    }
    if (filters.keyword.trim()) params.keyword = filters.keyword.trim()
    if (filters.className) params.className = filters.className
    if (filters.role) params.role = filters.role
    if (filters.status !== null && filters.status !== '') params.status = filters.status

    const res = await request.get('/users', { params })
    if (res.code !== 200) throw new Error(res.message || t('users.loadFailed'))

    users.value = (res.data?.records || []).map(normalizeUser)
    total.value = Number(res.data?.total || 0)
    selectedUsers.value = []
    tableRef.value?.clearSelection()

    if (users.value.length === 0 && pagination.pageNum > 1 && total.value > 0) {
      pagination.pageNum -= 1
      await loadUsers()
    }
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('users.loadFailed')))
  } finally {
    loading.value = false
  }
}

const loadClasses = async () => {
  try {
    const res = await request.get('/dict/classes')
    if (res.code === 200) {
      classOptions.value = [...new Set((res.data || []).map(item => item.className).filter(Boolean))]
    }
  } catch (error) {
    console.error('班级选项加载失败:', error)
  }
}

const handleSearch = () => {
  pagination.pageNum = 1
  loadUsers()
}

const resetFilters = () => {
  filters.keyword = ''
  filters.className = ''
  filters.role = ''
  filters.status = null
  handleSearch()
}

const handleSizeChange = () => {
  pagination.pageNum = 1
  loadUsers()
}

const handleSelectionChange = (selection) => {
  selectedUsers.value = selection
}

const canToggleStatus = (user) => Number(user.id) !== Number(userStore.user?.id)
const canSelectRow = (user) => canToggleStatus(user)

const changeUserStatus = async (user) => {
  const nextStatus = user.status === 1 ? 0 : 1
  const isEnable = nextStatus === 1
  try {
    await ElMessageBox.confirm(
      isEnable
        ? t('users.confirmEnableMsg', { name: user.realName || user.username })
        : t('users.confirmDisableMsg', { name: user.realName || user.username }),
      isEnable ? t('users.confirmEnableTitle') : t('users.confirmDisableTitle'),
      { type: isEnable ? 'success' : 'warning' }
    )
    const res = await request.put(`/users/${user.id}/status`, { status: nextStatus })
    if (res.code !== 200) throw new Error(res.message || (isEnable ? t('users.enableFailed') : t('users.disableFailed')))
    ElMessage.success(res.message || (isEnable ? t('users.enableSuccess') : t('users.disableSuccess')))
    await loadUsers()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(getErrorMessage(error, isEnable ? t('users.enableFailed') : t('users.disableFailed')))
    }
  }
}

const changeBatchStatus = async (status) => {
  const isEnable = status === 1
  const ids = selectedUsers.value.map(user => user.id)
  try {
    await ElMessageBox.confirm(
      isEnable
        ? t('users.confirmBatchEnableMsg', { n: ids.length })
        : t('users.confirmBatchDisableMsg', { n: ids.length }),
      isEnable ? t('users.batchEnableTitle') : t('users.batchDisableTitle'),
      { type: isEnable ? 'success' : 'warning' }
    )
    const res = await request.put('/users/batch-status', { ids, status })
    if (res.code !== 200) throw new Error(res.message || (isEnable ? t('users.batchEnableFailed') : t('users.batchDisableFailed')))
    ElMessage.success(res.message || (isEnable ? t('users.batchEnableSuccess') : t('users.batchDisableSuccess')))
    await loadUsers()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(getErrorMessage(error, isEnable ? t('users.batchEnableFailed') : t('users.batchDisableFailed')))
    }
  }
}

const openResetPassword = (user) => {
  resetDialog.user = user
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  resetDialog.visible = true
}

const submitResetPassword = async () => {
  if (!passwordFormRef.value || !resetDialog.user) return
  const valid = await passwordFormRef.value.validate().catch(() => false)
  if (!valid) return

  resetDialog.submitting = true
  try {
    const res = await request.put(`/users/${resetDialog.user.id}/reset-password`, {
      newPassword: passwordForm.newPassword
    })
    if (res.code !== 200) throw new Error(res.message || t('users.passwordResetFailed'))
    ElMessage.success(t('users.passwordResetSuccess'))
    resetDialog.visible = false
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('users.passwordResetFailed')))
  } finally {
    resetDialog.submitting = false
  }
}

const getRoleText = (role) => {
  const roleItem = roleOptions.value.find(item => item.value === role)
  return roleItem?.label || role || '-'
}

onMounted(() => {
  loadClasses()
  loadUsers()
})
</script>

<style scoped>
.users-page {
  padding: 28px;
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
}

.page-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 22px;
}

.page-heading h2 {
  margin: 0;
  color: #1f2329;
  font-size: 22px;
}

.page-heading p {
  margin: 8px 0 0;
  color: #8a8f99;
  font-size: 14px;
}

.filter-panel {
  display: grid;
  grid-template-columns: minmax(280px, 2fr) repeat(3, minmax(140px, 1fr)) auto;
  gap: 12px;
  padding: 18px;
  margin-bottom: 16px;
  background: #f7f8fa;
  border-radius: 10px;
}

.filter-actions {
  display: flex;
  white-space: nowrap;
}

.batch-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 40px;
  margin-bottom: 12px;
  color: #606266;
  font-size: 14px;
}

.pagination-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 20px;
  color: #8a8f99;
  font-size: 13px;
}

.dialog-tip {
  margin: 0 0 22px;
  color: #606266;
  line-height: 1.6;
}

@media (max-width: 1100px) {
  .filter-panel {
    grid-template-columns: repeat(2, minmax(180px, 1fr));
  }

  .keyword-input {
    grid-column: 1 / -1;
  }
}

@media (max-width: 768px) {
  .users-page {
    padding: 16px;
  }

  .page-heading p {
    display: none;
  }

  .filter-panel {
    grid-template-columns: 1fr;
    padding: 14px;
  }

  .keyword-input {
    grid-column: auto;
  }

  .filter-actions,
  .filter-actions :deep(.el-button) {
    flex: 1;
  }

  .batch-toolbar,
  .pagination-wrap {
    align-items: flex-start;
    flex-direction: column;
  }

  .pagination-wrap {
    overflow-x: auto;
  }
}
</style>
