<template>
  <div class="leave-approve">
    <div class="page-header">
      <h2>{{ t('leaveApprove.title') }}</h2>
    </div>
    <p class="approval-stage">{{ approvalStage }}</p>

    <div class="search-bar">
      <div class="search-row">
        <input v-model="searchForm.keyword" type="text" :placeholder="t('common.pleaseInput') + t('users.realName')" class="search-field" />
        <el-select v-model="searchForm.status" :placeholder="t('common.pleaseSelect') + t('leaveApprove.status')" class="search-field">
          <el-option label="全部" value="" />
          <el-option :label="t('leaveApprove.pending')" value="PENDING" />
          <el-option :label="t('leaveApprove.counselorApproved')" value="COUNSELOR_APPROVED" />
          <el-option :label="t('leaveApprove.approved')" value="APPROVED" />
          <el-option :label="t('leaveApprove.rejected')" value="REJECTED" />
        </el-select>
        <button class="search-btn" @click="handleSearch">{{ t('common.search') }}</button>
        <button class="search-btn" @click="handleReset">{{ t('common.reset') }}</button>
      </div>
    </div>

    <div class="approve-table">
      <div class="table-header">
        <span>{{ t('leaveApprove.applicant') }}</span>
        <span>{{ t('leaveApply.leaveType') }}</span>
        <span>{{ t('leaveApply.startDate') }}</span>
        <span>{{ t('leaveApply.endDate') }}</span>
        <span>{{ t('leaveApply.reason') }}</span>
        <span>{{ t('leaveApprove.status') }}</span>
        <span>{{ t('users.actions') }}</span>
      </div>
      <div v-if="pendingLeaves.length === 0" class="empty-row">
        {{ t('dashboard.noData') }}
      </div>
      <div v-for="leave in pendingLeaves" :key="leave.id" class="table-row">
        <span>{{ leave.studentName || '学生' + leave.studentId }}</span>
        <span>{{ leave.leaveType === 'EVENING_LATE' ? t('checkReport.late') : t('leaveApply.outsideStay') }}</span>
        <span>{{ formatDate(leave.startTime) }}</span>
        <span>{{ formatDate(leave.endTime) }}</span>
        <span>{{ leave.reason }}</span>
        <span :class="getStatusClass(leave.status)">{{ getStatusText(leave.status) }}</span>
        <span class="actions">
          <template v-if="leave.status === 'PENDING' || leave.status === 'COUNSELOR_APPROVED'">
            <button class="action-btn approve" @click="handleApprove(leave)">{{ t('leaveApprove.approveBtn') }}</button>
            <button class="action-btn reject" @click="handleReject(leave)">{{ t('leaveApprove.rejectBtn') }}</button>
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

const pendingLeaves = ref([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const searchForm = reactive({ keyword: '', status: '' })

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

const getStatusText = (status) => {
  const texts = {
    PENDING: t('leaveApprove.pending'),
    COUNSELOR_APPROVED: t('leaveApprove.counselorApproved'),
    APPROVED: t('leaveApprove.approved'),
    REJECTED: t('leaveApprove.rejected')
  }
  return texts[status] || status
}

const getStatusClass = (status) => {
  return `status-${status.toLowerCase()}`
}

const fetchPendingLeaves = async () => {
  try {
    const params = {
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      ...searchForm
    }
    const res = await request.get('/leaves/pending', { params })
    if (res.code === 200) {
      pendingLeaves.value = res.data.records || res.data
      total.value = res.data.total || res.data.length || 0
    }
  } catch (error) {
    console.error('获取待审批请假失败', error)
  }
}

const handleSearch = () => {
  pageNum.value = 1
  fetchPendingLeaves()
}

const handleReset = () => {
  searchForm.keyword = ''
  searchForm.status = ''
  pageNum.value = 1
  fetchPendingLeaves()
}

const handleSizeChange = (size) => {
  pageSize.value = size
  pageNum.value = 1
  fetchPendingLeaves()
}

const handleCurrentChange = (page) => {
  pageNum.value = page
  fetchPendingLeaves()
}

const handleApprove = async (row) => {
  try {
    const res = await request.put(`/leaves/approve/${row.id}`, {
      status: userStore.user.role === 'COUNSELOR' ? 'COUNSELOR_APPROVED' : 'APPROVED',
      approverId: userStore.user.id,
      comment: userStore.user.role === 'COUNSELOR' ? '辅导员已批准' : '管理员已批准'
    })
    if (res.code === 200) {
      ElMessage.success(t('common.success'))
      fetchPendingLeaves()
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
      fetchPendingLeaves()
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

.page-header {
  margin-bottom: 16px;
}

.page-header h2 {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  color: #000000;
}

.approval-stage {
  font-size: 14px;
  color: #888;
  margin: 0 0 20px;
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

.approve-table {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e8e8e8;
}

.table-header {
  display: grid;
  grid-template-columns: 1fr 1fr 2fr 2fr 3fr 1fr 2fr;
  padding: 16px 24px;
  background: #f8f8f8;
  font-size: 12px;
  font-weight: 600;
  color: #888888;
}

.table-row {
  display: grid;
  grid-template-columns: 1fr 1fr 2fr 2fr 3fr 1fr 2fr;
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

.status-pending {
  color: #d4a017;
}

.status-counselor_approved {
  color: #1976d2;
}

.status-approved {
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
  .leave-approve {
    padding: 16px;
  }

  .page-header h2 {
    font-size: 18px;
  }

  .approval-stage {
    font-size: 13px;
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

  .pagination {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
