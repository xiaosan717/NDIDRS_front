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
          <button class="action-btn" @click="handleProcess(hazard)">{{ t('hazardHandle.processing') }}</button>
          <button class="action-btn complete" @click="handleComplete(hazard)">完成</button>
          <button class="action-btn reject" @click="handleReject(hazard)">驳回</button>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'
import request from '../utils/request'

const { t } = useI18n()
const userStore = useUserStore()

const pendingHazards = ref([])

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

const handleProcess = async (row) => {
  try {
    const res = await request.put(`/hazards/handle/${row.id}`, {
      status: 'PROCESSING',
      handlerId: userStore.user.id,
      handleRemark: '正在处理'
    })
    if (res.code === 200) {
      ElMessage.success(t('common.success'))
      fetchPendingHazards()
    }
  } catch (error) {
    ElMessage.error(t('common.error'))
  }
}

const handleComplete = async (row) => {
  try {
    const res = await request.put(`/hazards/handle/${row.id}`, {
      status: 'COMPLETED',
      handlerId: userStore.user.id,
      handleRemark: '已完成'
    })
    if (res.code === 200) {
      ElMessage.success(t('common.success'))
      pendingHazards.value = pendingHazards.value.filter(h => h.id !== row.id)
    }
  } catch (error) {
    ElMessage.error(t('common.error'))
  }
}

const handleReject = async (row) => {
  try {
    const res = await request.put(`/hazards/handle/${row.id}`, {
      status: 'REJECTED',
      handlerId: userStore.user.id,
      handleRemark: '已驳回'
    })
    if (res.code === 200) {
      ElMessage.success(t('common.success'))
      pendingHazards.value = pendingHazards.value.filter(h => h.id !== row.id)
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
</style>