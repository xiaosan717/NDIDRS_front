<template>
  <div class="hazard-handle">
    <h2>{{ t('hazardHandle.title') }}</h2>
    
    <div class="handle-table">
      <div class="table-header">
        <span>{{ t('hazardHandle.reporter') }}</span>
        <span>{{ t('hazardReport.room') }}</span>
        <span>{{ t('hazardReport.hazardType') }}</span>
        <span>{{ t('hazardReport.description') }}</span>
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
        <span class="actions">
          <template v-if="isDormManager">
            <button class="action-btn complete" @click="handleApprove(hazard)">批准</button>
            <button class="action-btn reject" @click="handleReject(hazard)">驳回</button>
          </template>
          <template v-else-if="isAdmin">
            <button class="action-btn" @click="handleProcess(hazard)">{{ t('hazardHandle.processing') }}</button>
            <button class="action-btn complete" @click="handleComplete(hazard)">完成</button>
            <button class="action-btn reject" @click="handleReject(hazard)">驳回</button>
          </template>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'
import request from '../utils/request'

const { t } = useI18n()
const userStore = useUserStore()

const pendingHazards = ref([])

const isDormManager = computed(() => userStore.user?.role === 'DORM_MANAGER')
const isAdmin = computed(() => userStore.user?.role === 'ADMIN')

const getTypeText = (type) => {
  const texts = {
    WATER: t('hazardReport.fire'),
    ELECTRIC: t('hazardReport.electrical'),
    DOOR_LOCK: '门锁问题',
    FACILITY: t('hazardReport.facility'),
    OTHER: t('hazardReport.other')
  }
  return texts[type] || type
}

const fetchPendingHazards = async () => {
  try {
    const res = await request.get('/hazards/pending')
    if (res.code === 200) {
      pendingHazards.value = res.data
    }
  } catch (error) {
    console.error('获取待处理隐患失败', error)
  }
}

const handleApprove = async (row) => {
  try {
    const res = await request.put(`/hazards/handle/${row.id}`, {
      status: 'MANAGER_APPROVED',
      handleRemark: '宿管已批准，转管理员处理'
    })
    if (res.code === 200) {
      ElMessage.success(t('common.success'))
      pendingHazards.value = pendingHazards.value.filter(h => h.id !== row.id)
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
      pendingHazards.value = pendingHazards.value.filter(h => h.id !== row.id)
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
      pendingHazards.value = pendingHazards.value.filter(h => h.id !== row.id)
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

.hazard-handle h2 {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 20px;
  color: #000000;
}

.handle-table {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e8e8e8;
}

.table-header {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 3fr 3fr;
  padding: 16px 24px;
  background: #f8f8f8;
  font-size: 12px;
  font-weight: 600;
  color: #888888;
}

.table-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 3fr 3fr;
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
  color: #333333;
  align-items: center;
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

@media (max-width: 768px) {
  .hazard-handle {
    padding: 16px;
  }

  .hazard-handle h2 {
    font-size: 18px;
    margin-bottom: 14px;
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
}
</style>