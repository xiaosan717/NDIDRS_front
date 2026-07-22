<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h1 class="dashboard-title">{{ t('dashboard.title') }}</h1>
      <div class="export-buttons" v-if="showExportButtons">
        <button class="ai-entry-btn" @click="router.push('/ai-analysis')">✦ {{ t('home.aiAnalysis') }}</button>
        <button class="export-btn" @click="exportCheckRecords">导出查寝记录</button>
        <button class="export-btn" @click="exportLeaveRecords">导出请假记录</button>
        <button class="export-btn" @click="exportHazardRecords">导出隐患记录</button>
        <button class="export-btn" @click="exportUserRecords">导出用户列表</button>
      </div>
    </div>
    
    <section class="stats-section">
      <div v-for="(stat, key) in stats" :key="key" class="stat-item">
        <span class="stat-value">{{ stat.value }}</span>
        <span class="stat-label">{{ stat.label }}</span>
      </div>
    </section>
    
    <div class="charts-section">
      <section class="chart-card">
        <h2 class="section-title">{{ t('dashboard.status') }}</h2>
        <div id="pieChart" class="chart-container"></div>
      </section>
      
      <section class="chart-card">
        <h2 class="section-title">{{ t('dashboard.weeklyTrend') }}</h2>
        <div id="barChart" class="chart-container"></div>
      </section>
    </div>
    
    <div class="content-section">
      <section class="todo-section">
        <h2 class="section-title">{{ t('dashboard.pendingItems') }}</h2>
        <ul class="todo-list">
          <li
            v-for="(item, index) in filteredPendingTasks"
            :key="index"
            class="todo-item"
            :class="{'urgent': item.isUrgent, 'clickable': item.route}"
            @click="handleTodoClick(item)"
          >
            <span class="todo-label">{{ item.label }}</span>
            <span class="todo-count" :class="{'urgent-count': item.isUrgent}">
              {{ item.count }}
              <span v-if="item.route" class="arrow-icon">→</span>
            </span>
          </li>
          <li v-if="filteredPendingTasks.length === 0" class="todo-item empty">
            <span class="todo-label">{{ t('dashboard.noPending') }}</span>
          </li>
        </ul>
      </section>
      
      <section class="records-section">
        <h2 class="section-title">{{ t('dashboard.recentRecords') }}</h2>
        <div class="records-table">
          <div class="table-header">
            <span>{{ t('dashboard.time') }}</span>
            <span>{{ t('dashboard.content') }}</span>
            <span>{{ t('rooms.roomNumber') }}</span>
            <span>{{ t('dashboard.status') }}</span>
          </div>
          <div v-for="record in latestRecords" :key="record.studentName + record.checkDate" class="table-row">
            <span>{{ record.checkDate }}</span>
            <span>{{ record.studentName }}</span>
            <span>{{ record.roomNumber }}</span>
            <span class="status-tag" :class="record.status.toLowerCase()">{{ getStatusText(record.status) }}</span>
          </div>
          <div v-if="latestRecords.length === 0" class="empty-row">
            {{ t('dashboard.noData') }}
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '../stores/user'
import { useRouter } from 'vue-router'
import request from '../utils/request'
import * as echarts from 'echarts'

const { t } = useI18n()
const userStore = useUserStore()
const router = useRouter()

let pieChart = null
let barChart = null

const stats = reactive({
  students: { value: '0', label: t('dashboard.studentCount') },
  rooms: { value: '0', label: t('dashboard.roomCount') },
  checkCount: { value: '0', label: t('dashboard.checkCount') },
  hazardCount: { value: '0', label: t('dashboard.hazardCount') }
})

const pendingTasks = reactive({})

const latestRecords = reactive([])

const showExportButtons = computed(() => {
  const role = userStore.user?.role
  return role === 'ADMIN' || role === 'COUNSELOR' || role === 'DORM_MANAGER'
})

const downloadFile = (url, filename) => {
  request.get(url, { responseType: 'blob' })
    .then(blob => {
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
    })
    .catch(err => {
      console.error('导出失败:', err)
    })
}

const exportCheckRecords = () => {
  downloadFile('/export/checkRecords', '查寝记录.xlsx')
}

const exportLeaveRecords = () => {
  downloadFile('/export/leaveRecords', '请假记录.xlsx')
}

const exportHazardRecords = () => {
  downloadFile('/export/hazardRecords', '隐患记录.xlsx')
}

const exportUserRecords = () => {
  downloadFile('/export/userRecords', '用户列表.xlsx')
}

// 根据角色动态映射待办事项,并添加跳转路由
const filteredPendingTasks = computed(() => {
  const role = userStore.user?.role
  const result = []

  if (role === 'ADMIN') {
    if (pendingTasks.pendingLeaveApproval > 0) {
      result.push({ label: '待审批请假', count: pendingTasks.pendingLeaveApproval, isUrgent: false, route: '/leave-approve' })
    }
    if (pendingTasks.pendingHazardHandle > 0) {
      result.push({ label: '待处理隐患', count: pendingTasks.pendingHazardHandle, isUrgent: true, route: '/hazard-handle' })
    }
    if (pendingTasks.todayLateCount > 0) {
      result.push({ label: '今日晚归', count: pendingTasks.todayLateCount, isUrgent: false, route: '/records' })
    }
    if (pendingTasks.todayAbsentCount > 0) {
      result.push({ label: '今日缺勤', count: pendingTasks.todayAbsentCount, isUrgent: true, route: '/records' })
    }
  } else if (role === 'COUNSELOR') {
    if (pendingTasks.pendingLeaveApproval > 0) {
      result.push({ label: '待审批请假', count: pendingTasks.pendingLeaveApproval, isUrgent: false, route: '/leave-approve' })
    }
    if (pendingTasks.todayLateCount > 0) {
      result.push({ label: '本班晚归', count: pendingTasks.todayLateCount, isUrgent: false, route: '/records' })
    }
    if (pendingTasks.todayAbsentCount > 0) {
      result.push({ label: '本班缺勤', count: pendingTasks.todayAbsentCount, isUrgent: true, route: '/records' })
    }
  } else if (role === 'DORM_MANAGER') {
    if (pendingTasks.pendingHazardApproval > 0) {
      result.push({ label: '待审批隐患', count: pendingTasks.pendingHazardApproval, isUrgent: true, route: '/hazard-handle' })
    }
    if (pendingTasks.uncheckedRoomCount > 0) {
      result.push({ label: '未填报宿舍', count: pendingTasks.uncheckedRoomCount, isUrgent: true, route: '/check-report' })
    }
    if (pendingTasks.todayLateCount > 0) {
      result.push({ label: '本楼晚归', count: pendingTasks.todayLateCount, isUrgent: false, route: '/records' })
    }
    if (pendingTasks.todayAbsentCount > 0) {
      result.push({ label: '本楼缺勤', count: pendingTasks.todayAbsentCount, isUrgent: false, route: '/records' })
    }
  } else if (role === 'DORM_LEADER') {
    if (pendingTasks.needTodayCheck === 1) {
      result.push({ label: '今日未填报', count: 1, isUrgent: true, route: '/check-report' })
    }
    if (pendingTasks.myApprovedLeave > 0) {
      result.push({ label: '已批准请假', count: pendingTasks.myApprovedLeave, isUrgent: false })
    }
  } else if (role === 'STUDENT') {
    if (pendingTasks.myPendingLeave > 0) {
      result.push({ label: '我的待审批请假', count: pendingTasks.myPendingLeave, isUrgent: false, route: '/leave-apply' })
    }
    if (pendingTasks.myPendingHazard > 0) {
      result.push({ label: '我的待处理隐患', count: pendingTasks.myPendingHazard, isUrgent: false, route: '/hazard-report' })
    }
  }

  return result
})

// 点击待办事项跳转
const handleTodoClick = (item) => {
  if (item.route) {
    router.push(item.route)
  }
}

const getTaskLabel = (key) => {
  const labels = {
    leave: t('leaveApprove.title'),
    hazard: t('hazardHandle.title'),
    late: t('checkReport.late') + '登记',
    absent: t('checkReport.absent') + '预警'
  }
  return labels[key] || key
}

const getStatusText = (status) => {
  const texts = {
    IN_ROOM: t('checkReport.allPresent'),
    LEAVE: t('records.leave'),
    LATE: t('checkReport.late'),
    ABSENT: t('checkReport.absent')
  }
  return texts[status] || status
}

const initPieChart = (data) => {
  const dom = document.getElementById('pieChart')
  if (!dom) return
  
  if (pieChart) {
    pieChart.dispose()
  }
  
  pieChart = echarts.init(dom)
  
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: {
        color: '#333333',
        fontSize: 13
      }
    },
    series: [
      {
        name: t('dashboard.status'),
        type: 'pie',
        radius: ['50%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 4,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: [
          { value: data.inRoom || 0, name: t('checkReport.allPresent'), itemStyle: { color: '#4caf50' } },
          { value: data.leave || 0, name: t('records.leave'), itemStyle: { color: '#2196f3' } },
          { value: data.late || 0, name: t('checkReport.late'), itemStyle: { color: '#ff9800' } },
          { value: data.absent || 0, name: t('checkReport.absent'), itemStyle: { color: '#f44336' } }
        ]
      }
    ]
  }
  
  pieChart.setOption(option)
}

const initBarChart = (weeklyData) => {
  const dom = document.getElementById('barChart')
  if (!dom) return
  
  if (barChart) {
    barChart.dispose()
  }
  
  barChart = echarts.init(dom)
  
  const dates = weeklyData.map(item => item.date.substring(5))
  const inRoomData = weeklyData.map(item => item.inRoom)
  const lateData = weeklyData.map(item => item.late)
  const absentData = weeklyData.map(item => item.absent)
  const leaveData = weeklyData.map(item => item.leave)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: [t('checkReport.allPresent'), t('records.leave'), t('checkReport.late'), t('checkReport.absent')],
      top: 0,
      textStyle: {
        fontSize: 12
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '40px',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: {
        lineStyle: {
          color: '#e0e0e0'
        }
      },
      axisLabel: {
        color: '#666666'
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: '#666666'
      },
      splitLine: {
        lineStyle: {
          color: '#f0f0f0'
        }
      }
    },
    series: [
      {
        name: t('checkReport.allPresent'),
        type: 'bar',
        stack: 'total',
        data: inRoomData,
        itemStyle: { color: '#4caf50' }
      },
      {
        name: t('records.leave'),
        type: 'bar',
        stack: 'total',
        data: leaveData,
        itemStyle: { color: '#2196f3' }
      },
      {
        name: t('checkReport.late'),
        type: 'bar',
        stack: 'total',
        data: lateData,
        itemStyle: { color: '#ff9800' }
      },
      {
        name: t('checkReport.absent'),
        type: 'bar',
        stack: 'total',
        data: absentData,
        itemStyle: { color: '#f44336' }
      }
    ]
  }
  
  barChart.setOption(option)
}

const fetchData = async () => {
  const token = localStorage.getItem('token')
  console.log('当前token:', token ? '存在' : '不存在')
  console.log('当前用户:', JSON.stringify(userStore.user))
  
  const fetchWithError = async (url, name) => {
    try {
      const res = await request.get(url)
      console.log(`${name}响应:`, res)
      return res
    } catch (error) {
      console.error(`${name}请求失败:`, error)
      return { code: 500, data: null }
    }
  }
  
  const [statsRes, statusRes, weeklyRes, pendingRes, recordsRes] = await Promise.all([
    fetchWithError('/dashboard/stats', 'stats'),
    fetchWithError('/dashboard/statusDistribution', 'statusDistribution'),
    fetchWithError('/dashboard/weeklyTrend', 'weeklyTrend'),
    fetchWithError('/dashboard/pending', 'pending'),
    fetchWithError('/dashboard/recentRecords', 'recentRecords')
  ])
  
  if (statsRes.code === 200) {
    stats.students.value = String(statsRes.data.studentCount || 0)
    stats.rooms.value = String(statsRes.data.roomCount || 0)
    stats.checkCount.value = String(statsRes.data.checkCount || 0)
    stats.hazardCount.value = String(statsRes.data.hazardCount || 0)
  }
  
  if (statusRes.code === 200) {
    setTimeout(() => initPieChart(statusRes.data), 200)
  }
  
  if (weeklyRes.code === 200) {
    setTimeout(() => initBarChart(weeklyRes.data), 200)
  }
  
  if (pendingRes.code === 200) {
    Object.keys(pendingTasks).forEach(key => delete pendingTasks[key])
    Object.assign(pendingTasks, pendingRes.data)
  }
  
  if (recordsRes.code === 200) {
    latestRecords.splice(0, latestRecords.length, ...recordsRes.data.map(r => ({
      checkDate: r.checkDate,
      studentName: r.studentName || '学生' + r.studentId,
      roomNumber: r.roomNumber || '宿舍' + r.roomId,
      status: r.status
    })))
  }
}

const handleResize = () => {
  pieChart?.resize()
  barChart?.resize()
}

onMounted(() => {
  fetchData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  pieChart?.dispose()
  barChart?.dispose()
})
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.stats-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.stat-item {
  padding: 28px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8e8e8;
}

.stat-value {
  display: block;
  font-size: 40px;
  font-weight: 900;
  letter-spacing: -2px;
  color: #000000;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 13px;
  font-weight: 500;
  color: #888888;
  letter-spacing: 0.5px;
}

.charts-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.chart-card {
  padding: 28px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8e8e8;
}

.chart-container {
  width: 100%;
  height: 300px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
}

.dashboard-title {
  font-size: 24px;
  font-weight: 700;
  color: #000000;
  margin: 0;
}

.export-buttons {
  display: flex;
  gap: 10px;
}

.export-btn {
  padding: 10px 20px;
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #333333;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ai-entry-btn {
  padding: 10px 20px;
  background: #111111;
  border: 1px solid #111111;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ai-entry-btn:hover {
  background: #333333;
}

.export-btn:hover {
  background: #f5f5f5;
  border-color: #bdbdbd;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.3px;
  color: #000000;
  margin: 0 0 20px;
}

.content-section {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 20px;
}

.todo-section,
.records-section {
  padding: 28px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8e8e8;
}

.todo-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.todo-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: #f8f8f8;
  border-radius: 8px;
  margin-bottom: 10px;
  cursor: default;
}

.todo-item.clickable {
  cursor: pointer;
}

.todo-item.clickable:hover {
  background: #f0f0f0;
}

.todo-item.urgent {
  background: #fff3e0;
}

.todo-item.urgent:hover {
  background: #ffe0b2;
}

.todo-item.empty {
  background: #f0f0f0;
  color: #999;
  justify-content: center;
  cursor: default;
}

.todo-item:last-child {
  margin-bottom: 0;
}

.todo-label {
  font-size: 14px;
  color: #333333;
  font-weight: 500;
}

.todo-count {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #000000;
  padding: 4px 10px;
  border-radius: 12px;
  background: #e0e0e0;
}

.todo-count.urgent-count {
  background: #f44336;
  color: #ffffff;
}

.arrow-icon {
  font-size: 14px;
}

.records-table {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #f0f0f0;
}

.table-header {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  padding: 14px 20px;
  background: #f8f8f8;
  font-size: 12px;
  font-weight: 600;
  color: #888888;
}

.table-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  padding: 14px 20px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
  color: #333333;
}

.table-row:last-child {
  border-bottom: none;
}

.empty-row {
  padding: 32px;
  text-align: center;
  color: #999999;
  font-size: 14px;
}

.status-tag {
  display: inline-block;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  background: #f0f0f0;
  color: #333333;
  width: fit-content;
}

.status-tag.in_room {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-tag.leave {
  background: #e3f2fd;
  color: #1565c0;
}

.status-tag.late {
  background: #fff3e0;
  color: #ef6c00;
}

.status-tag.absent {
  background: #ffebee;
  color: #c62828;
}

/* === 移动端响应式 === */
@media (max-width: 768px) {
  .dashboard {
    gap: 16px;
  }

  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
  }

  .dashboard-title {
    font-size: 20px;
  }

  .export-buttons {
    flex-wrap: wrap;
    gap: 8px;
    width: 100%;
  }

  .export-btn {
    padding: 8px 14px;
    font-size: 12px;
  }

  .stats-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .stat-item {
    padding: 16px;
    border-radius: 10px;
  }

  .stat-value {
    font-size: 28px;
  }

  .stat-label {
    font-size: 11px;
  }

  .charts-section {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .chart-card {
    padding: 16px;
    border-radius: 10px;
  }

  .chart-container {
    height: 220px;
  }

  .content-section {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .todo-section,
  .records-section {
    padding: 16px;
    border-radius: 10px;
  }

  .section-title {
    font-size: 15px;
    margin-bottom: 14px;
  }

  .todo-item {
    padding: 12px;
  }

  .todo-label {
    font-size: 13px;
  }

  .todo-count {
    font-size: 14px;
    padding: 3px 8px;
  }

  .table-header {
    display: none;
  }

  .table-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 16px;
  }

  .table-row span:first-child {
    font-size: 11px;
    color: #999;
  }

  .table-row span:nth-child(2) {
    font-size: 14px;
    font-weight: 600;
  }
}
</style>
