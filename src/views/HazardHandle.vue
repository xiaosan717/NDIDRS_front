<template>
  <div class="hazard-handle">
    <div class="page-header">
      <h2>{{ t('hazardHandle.title') }}</h2>
    </div>

    <div class="search-bar">
      <div class="search-row">
        <input v-model="searchForm.keyword" type="text" :placeholder="t('common.pleaseInput') + t('hazardHandle.reporter')" class="search-field" />
        <el-select v-model="searchForm.status" :placeholder="t('common.pleaseSelect') + t('hazardHandle.status')" class="search-field">
          <el-option label="全部" value="" />
          <el-option :label="t('hazardHandle.pending')" value="REPORTED" />
          <el-option :label="t('hazardHandle.processing')" value="PROCESSING" />
          <el-option :label="t('hazardHandle.resolved')" value="COMPLETED" />
          <el-option :label="t('hazardHandle.managerApproved')" value="MANAGER_APPROVED" />
          <el-option :label="t('hazardHandle.rejected')" value="REJECTED" />
        </el-select>
        <button class="search-btn" @click="handleSearch">{{ t('common.search') }}</button>
        <button class="search-btn" @click="handleReset">{{ t('common.reset') }}</button>
      </div>
    </div>

    <div class="handle-table">
      <div class="table-header">
        <span>{{ t('hazardHandle.reporter') }}</span>
        <span>{{ t('hazardReport.room') }}</span>
        <span>{{ t('hazardReport.hazardType') }}</span>
        <span>{{ t('hazardReport.description') }}</span>
        <span>照片</span>
        <span>{{ t('hazardHandle.status') }}</span>
        <span>{{ t('users.actions') }}</span>
      </div>
      <div v-if="pendingHazards.length === 0" class="empty-row">
        {{ t('dashboard.noData') }}
      </div>
      <div v-for="hazard in pendingHazards" :key="hazard.id" class="table-row">
        <span>{{ hazard.studentName || '学生' + hazard.studentId }}</span>
        <span>{{ hazard.roomNumber || '宿舍' + hazard.roomId }}</span>
        <span>{{ getTypeText(hazard.hazardType) }}</span>
        <span>{{ hazard.description }}</span>
        <span>
          <el-image 
            v-if="hazard.image" 
            :src="hazard.image" 
            :preview-src-list="[hazard.image]"
            fit="cover"
            class="hazard-photo"
            preview-teleported
          />
          <span v-else>-</span>
        </span>
        <span :class="getStatusClass(hazard.status)">{{ getStatusText(hazard.status) }}</span>
        <span class="actions">
          <template v-if="isDormManager">
            <button v-if="hazard.status === 'REPORTED'" class="action-btn complete" @click="handleApprove(hazard)">{{ t('common.approve') }}</button>
            <button v-if="hazard.status === 'REPORTED'" class="action-btn reject" @click="handleReject(hazard)">{{ t('common.reject') }}</button>
          </template>
          <template v-else-if="isAdmin">
            <button v-if="hazard.status === 'REPORTED' || hazard.status === 'MANAGER_APPROVED'" class="action-btn" @click="handleProcess(hazard)">{{ t('hazardHandle.processing') }}</button>
            <button v-if="hazard.status === 'PROCESSING'" class="action-btn complete" @click="handleComplete(hazard)">{{ t('common.complete') }}</button>
            <button v-if="hazard.status !== 'COMPLETED'" class="action-btn reject" @click="handleReject(hazard)">{{ t('common.reject') }}</button>
          </template>
        </span>
      </div>
    </div>

    <div class="pagination" v-if="total > 0">
      <span class="page-info">{{ t('common.total') }} {{ total }} {{ t('common.records') }}</span>
      <el-pagination
        :current-page="pageNum"
        :page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'
import request from '../utils/request'

const { t } = useI18n()
const userStore = useUserStore()

const pendingHazards = ref([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const searchForm = reactive({ keyword: '', status: '' })

const isDormManager = computed(() => userStore.user?.role === 'DORM_MANAGER')
const isAdmin = computed(() => userStore.user?.role === 'ADMIN')

const getTypeText = (type) => {
  if (!type) return '-'
  const normalizedType = type.toUpperCase().replace(/[^A-Z_]/g, '_')
  const texts = {
    WATER: t('hazardReport.fire'),
    ELECTRIC: t('hazardReport.electrical'),
    DOOR_LOCK: t('hazardReport.doorLock'),
    DOORLOCK: t('hazardReport.doorLock'),
    DOOR: t('hazardReport.doorLock'),
    FACILITY: t('hazardReport.facility'),
    OTHER: t('hazardReport.other'),
    FIRE: t('hazardReport.fire'),
    HYGIENE: t('hazardReport.hygiene')
  }
  return texts[normalizedType] || texts[type] || type
}

const getStatusText = (status) => {
  const texts = {
    REPORTED: t('hazardHandle.pending'),
    MANAGER_APPROVED: t('hazardHandle.managerApproved'),
    PROCESSING: t('hazardHandle.processing'),
    COMPLETED: t('hazardHandle.resolved'),
    REJECTED: t('hazardHandle.rejected')
  }
  return texts[status] || status
}

const getStatusClass = (status) => {
  return `status-${status.toLowerCase()}`
}

const fetchPendingHazards = async () => {
  try {
    const params = {
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      ...searchForm
    }
    const res = await request.get('/hazards/pending', { params })
    if (res.code === 200) {
      pendingHazards.value = res.data.records || res.data
      total.value = res.data.total || res.data.length || 0
    }
  } catch (error) {
    console.error('获取待处理隐患失败', error)
  }
}

const handleSearch = () => {
  pageNum.value = 1
  fetchPendingHazards()
}

const handleReset = () => {
  searchForm.keyword = ''
  searchForm.status = ''
  pageNum.value = 1
  fetchPendingHazards()
}

const handleSizeChange = (size) => {
  pageSize.value = size
  pageNum.value = 1
  fetchPendingHazards()
}

const handleCurrentChange = (page) => {
  pageNum.value = page
  fetchPendingHazards()
}

const handleApprove = async (row) => {
  try {
    const res = await request.put(`/hazards/handle/${row.id}`, {
      status: 'MANAGER_APPROVED',
      handleRemark: '宿管已批准，转管理员处理'
    })
    if (res.code === 200) {
      ElMessage.success(t('common.success'))
      fetchPendingHazards()
    } else {
      ElMessage.error(res.message || t('common.error'))
    }
  } catch (error) {
    ElMessage.error(t('common.error'))
  }
}

const handleProcess = async (row) => {
  try {
    const res = await request.put(`/hazards/handle/${row.id}`, {
      status: 'PROCESSING',
      handleRemark: '管理员已受理，正在处理'
    })
    if (res.code === 200) {
      ElMessage.success(t('common.success'))
      fetchPendingHazards()
    } else {
      ElMessage.error(res.message || t('common.error'))
    }
  } catch (error) {
    ElMessage.error(t('common.error'))
  }
}

const handleComplete = async (row) => {
  try {
    const res = await request.put(`/hazards/handle/${row.id}`, {
      status: 'COMPLETED',
      handleRemark: '隐患已处理完成'
    })
    if (res.code === 200) {
      ElMessage.success(t('common.success'))
      fetchPendingHazards()
    } else {
      ElMessage.error(res.message || t('common.error'))
    }
  } catch (error) {
    ElMessage.error(t('common.error'))
  }
}

const handleReject = async (row) => {
  try {
    const res = await request.put(`/hazards/handle/${row.id}`, {
      status: 'REJECTED',
      handleRemark: isDormManager.value ? '宿管已驳回' : '管理员已驳回'
    })
    if (res.code === 200) {
      ElMessage.success(t('common.success'))
      fetchPendingHazards()
    } else {
      ElMessage.error(res.message || t('common.error'))
    }
  } catch (error) {
    ElMessage.error(t('common.error'))
  }
}

onMounted(() => {
  fetchPendingHazards()
})
</script>

<style scoped>
.hazard-handle {
  padding: 32px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8e8e8;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  color: #000000;
}

.search-bar {
  margin-bottom: 20px;
}

.search-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-field {
  padding: 10px 16px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  font-size: 14px;
  min-width: 160px;
}

.search-field:focus {
  outline: none;
  border-color: #000000;
}

.search-btn {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  background: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.search-btn:hover {
  border-color: #000000;
  color: #000000;
}

.handle-table {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e8e8e8;
}

.table-header {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 3fr 80px 1fr 3fr;
  padding: 16px 24px;
  background: #f8f8f8;
  font-size: 12px;
  font-weight: 600;
  color: #888888;
}

.table-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 3fr 80px 1fr 3fr;
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
  color: #333333;
  align-items: center;
}

.hazard-photo {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  cursor: pointer;
}

.table-row:last-child {
  border-bottom: none;
}

.empty-row {
  padding: 40px;
  text-align: center;
  color: #888888;
  font-size: 14px;
}

.status-reported {
  color: #d4a017;
}

.status-manager_approved {
  color: #1976d2;
}

.status-processing {
  color: #1976d2;
}

.status-completed {
  color: #2e7d32;
}

.status-rejected {
  color: #c62828;
}

.actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  background: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  border-color: #000000;
  color: #000000;
}

.action-btn.complete:hover {
  background: #e8f5e9;
  border-color: #2e7d32;
  color: #2e7d32;
}

.action-btn.reject:hover {
  background: #ffebee;
  border-color: #c62828;
  color: #c62828;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

.page-info {
  font-size: 14px;
  color: #888888;
}

@media (max-width: 768px) {
  .hazard-handle {
    padding: 16px;
  }

  .page-header h2 {
    font-size: 18px;
    margin-bottom: 14px;
  }

  .search-row {
    flex-direction: column;
    gap: 10px;
  }

  .search-field {
    width: 100%;
    min-width: auto;
  }

  .handle-table {
    border: none;
    border-radius: 0;
    overflow: visible;
  }

  .table-header {
    display: none;
  }

  .table-row {
    grid-template-columns: 1fr;
    gap: 8px;
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

  .empty-row {
    padding: 24px 12px;
    font-size: 13px;
  }

  .actions {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
  }

  .action-btn {
    flex: 1;
    min-width: 80px;
    padding: 10px 12px;
    font-size: 12px;
  }

  .pagination {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
