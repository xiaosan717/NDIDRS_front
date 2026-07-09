<template>
  <div class="leave-approve">
    <h2>{{ t('leaveApprove.title') }}</h2>
    <p class="approval-stage">{{ approvalStage }}</p>
    
    <div class="approve-table">
      <div class="table-header">
        <span>{{ t('leaveApprove.applicant') }}</span>
        <span>{{ t('leaveApply.leaveType') }}</span>
        <span>{{ t('leaveApply.startDate') }}</span>
        <span>{{ t('leaveApply.endDate') }}</span>
        <span>{{ t('leaveApply.reason') }}</span>
        <span>{{ t('users.actions') }}</span>
      </div>
      <div v-if="pendingLeaves.length === 0" class="empty-row">
        {{ t('dashboard.noData') }}
      </div>
      <div v-for="leave in pendingLeaves" :key="leave.id" class="table-row">
        <span>{{ leave.studentName || '学生' + leave.studentId }}</span>
        <span>{{ leave.leaveType === 'EVENING_LATE' ? t('checkReport.late') : '校外住宿' }}</span>
        <span>{{ formatDate(leave.startTime) }}</span>
        <span>{{ formatDate(leave.endTime) }}</span>
        <span>{{ leave.reason }}</span>
        <span class="actions">
          <button class="action-btn approve" @click="handleApprove(leave)">{{ t('leaveApprove.approveBtn') }}</button>
          <button class="action-btn reject" @click="handleReject(leave)">{{ t('leaveApprove.rejectBtn') }}</button>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'
import request from '../utils/request'

const { t } = useI18n()
const userStore = useUserStore()

const pendingLeaves = ref([])

const approvalStage = computed(() => {
  const role = userStore.user?.role
  if (role === 'COUNSELOR') {
    return t('leaveApprove.counselorStage')
  } else if (role === 'ADMIN') {
    return t('leaveApprove.adminStage')
  }
  return ''
})

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

const fetchPendingLeaves = async () => {
  try {
    const res = await request.get('/leaves/pending')
    if (res.code === 200) {
      pendingLeaves.value = res.data
    }
  } catch (error) {
    console.error('获取待审批请假失败', error)
  }
}

const handleApprove = async (row) => {
  try {
    const res = await request.put(`/leaves/approve/${row.id}`, {
      status: 'APPROVED',
      approverId: userStore.user.id,
      comment: userStore.user.role === 'COUNSELOR' ? '辅导员已批准' : '管理员已批准'
    })
    if (res.code === 200) {
      ElMessage.success(t('common.success'))
      pendingLeaves.value = pendingLeaves.value.filter(l => l.id !== row.id)
    } else {
      ElMessage.error(res.message || t('common.error'))
    }
  } catch (error) {
    ElMessage.error(t('common.error'))
  }
}

const handleReject = async (row) => {
  try {
    const res = await request.put(`/leaves/approve/${row.id}`, {
      status: 'REJECTED',
      approverId: userStore.user.id,
      comment: userStore.user.role === 'COUNSELOR' ? '辅导员已驳回' : '管理员已驳回'
    })
    if (res.code === 200) {
      ElMessage.success(t('common.success'))
      pendingLeaves.value = pendingLeaves.value.filter(l => l.id !== row.id)
    } else {
      ElMessage.error(res.message || t('common.error'))
    }
  } catch (error) {
    ElMessage.error(t('common.error'))
  }
}

onMounted(() => {
  fetchPendingLeaves()
})
</script>

<style scoped>
.leave-approve {
  padding: 32px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8e8e8;
}

.leave-approve h2 {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 20px;
  color: #000000;
}

.approve-table {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e8e8e8;
}

.table-header {
  display: grid;
  grid-template-columns: 1fr 1fr 2fr 2fr 3fr 2fr;
  padding: 16px 24px;
  background: #f8f8f8;
  font-size: 12px;
  font-weight: 600;
  color: #888888;
}

.table-row {
  display: grid;
  grid-template-columns: 1fr 1fr 2fr 2fr 3fr 2fr;
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

.action-btn.approve:hover {
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
  .leave-approve {
    padding: 16px;
  }

  .leave-approve h2 {
    font-size: 18px;
    margin-bottom: 14px;
  }

  .approval-stage {
    font-size: 13px;
    margin-bottom: 14px;
  }

  .approve-table {
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
    gap: 8px;
  }

  .action-btn {
    flex: 1;
    padding: 10px 12px;
    font-size: 12px;
  }
}
</style>