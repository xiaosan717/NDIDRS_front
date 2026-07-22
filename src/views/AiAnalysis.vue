<template>
  <div class="ai-page">
    <section class="hero-card">
      <div class="hero-text">
        <div class="eyebrow">NDIDRS · AI</div>
        <h1>{{ t('aiAnalysis.title') }}</h1>
        <p>{{ t('aiAnalysis.subtitle') }}</p>
      </div>
      <div class="hero-owl">
        <XiaoyeOwl />
        <div class="owl-name">小夜</div>
      </div>
      <div class="privacy-note">
        <DataAnalysis class="privacy-icon" />
        <span>{{ t('aiAnalysis.privacy') }}</span>
      </div>
    </section>

    <section class="control-card">
      <div class="preset-row">
        <button
          v-for="preset in presets"
          :key="preset.value"
          :class="['preset-btn', { active: rangeMode === preset.value }]"
          @click="selectPreset(preset.value)"
        >
          {{ preset.label }}
        </button>
      </div>

      <div v-if="rangeMode === 'custom'" class="field-group date-field">
        <label>{{ t('aiAnalysis.dateRange') }}</label>
        <el-date-picker
          v-model="customRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          :start-placeholder="t('aiAnalysis.rangeStart')"
          :end-placeholder="t('aiAnalysis.rangeEnd')"
          :disabled-date="disableFutureDate"
        />
      </div>

      <div class="field-group">
        <label>{{ t('aiAnalysis.question') }}</label>
        <el-input
          v-model="question"
          type="textarea"
          :rows="3"
          maxlength="500"
          show-word-limit
          :placeholder="t('aiAnalysis.questionPlaceholder')"
        />
        <div class="quick-questions">
          <button v-for="item in quickQuestions" :key="item" @click="question = item">
            {{ item }}
          </button>
        </div>
      </div>

      <button class="generate-btn" :disabled="loading" @click="generateAnalysis">
        <Loading v-if="loading" class="spin" />
        <MagicStick v-else />
        <span>{{ loading ? t('common.loading') : t('aiAnalysis.generate') }}</span>
      </button>
    </section>

    <template v-if="analysis">
      <section class="result-meta">
        <span :class="['provider-badge', { fallback: !analysis.aiAvailable }]">
          {{ analysis.aiAvailable ? t('aiAnalysis.providerAi') : t('aiAnalysis.providerRule') }}
        </span>
        <span>{{ analysis.startDate }} — {{ analysis.endDate }}</span>
        <span>{{ t('aiAnalysis.generatedAt') }}：{{ formatDateTime(analysis.generatedAt) }}</span>
      </section>

      <div v-if="!analysis.aiAvailable" class="fallback-notice">
        {{ t('aiAnalysis.ruleNotice') }}
      </div>

      <section class="stats-grid">
        <article v-for="card in statCards" :key="card.key" class="stat-card">
          <span class="stat-label">{{ card.label }}</span>
          <strong>{{ card.value }}<small v-if="card.suffix">{{ card.suffix }}</small></strong>
        </article>
      </section>

      <section class="content-card anomaly-card">
        <div class="card-heading">
          <UserFilled />
          <h2>{{ t('aiAnalysis.anomalyPeople') }}</h2>
        </div>
        <div v-if="analysis.anomalyRecords?.length" class="anomaly-table-wrap">
          <table class="anomaly-table">
            <thead>
              <tr>
                <th>{{ t('aiAnalysis.date') }}</th>
                <th>{{ t('aiAnalysis.status') }}</th>
                <th>{{ t('aiAnalysis.studentName') }}</th>
                <th>{{ t('aiAnalysis.studentNumber') }}</th>
                <th>{{ t('aiAnalysis.room') }}</th>
                <th>{{ t('aiAnalysis.remark') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in analysis.anomalyRecords" :key="record.recordId">
                <td>{{ record.date }}</td>
                <td>
                  <span :class="['status-tag', record.status === 'ABSENT' ? 'absent' : 'late']">
                    {{ anomalyStatusText(record.status) }}
                  </span>
                </td>
                <td><strong>{{ record.studentName || '-' }}</strong></td>
                <td>{{ record.studentNumber || '-' }}</td>
                <td>{{ record.roomName || '-' }}</td>
                <td>{{ record.remark || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-risk">{{ t('aiAnalysis.noAnomalyPeople') }}</div>
      </section>

      <section class="report-grid">
        <article class="content-card report-card">
          <div class="card-heading">
            <MagicStick />
            <h2>{{ t('aiAnalysis.reportTitle') }}</h2>
          </div>
          <div class="report-content">{{ analysis.report }}</div>
        </article>

        <article class="content-card risk-card">
          <div class="card-heading">
            <Warning />
            <h2>{{ t('aiAnalysis.riskRooms') }}</h2>
          </div>
          <div v-if="analysis.riskRooms?.length" class="risk-list">
            <div v-for="room in analysis.riskRooms" :key="room.roomId" class="risk-item">
              <div>
                <strong>{{ room.roomName }}</strong>
                <span>{{ t('aiAnalysis.anomalyCount') }}：{{ room.anomalyCount }}</span>
              </div>
              <span :class="['risk-tag', room.riskLevel.toLowerCase()]">
                {{ riskText(room.riskLevel) }}
              </span>
            </div>
          </div>
          <div v-else class="empty-risk">{{ t('aiAnalysis.noRisk') }}</div>
        </article>
      </section>

      <section class="content-card trend-card">
        <div class="card-heading">
          <TrendCharts />
          <h2>{{ t('aiAnalysis.trendTitle') }}</h2>
        </div>
        <div ref="trendChartElement" class="trend-chart"></div>
      </section>
    </template>

    <section v-else class="empty-state">
      <MagicStick />
      <h2>{{ t('aiAnalysis.emptyTitle') }}</h2>
      <p>{{ t('aiAnalysis.emptyDesc') }}</p>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { DataAnalysis, Loading, MagicStick, TrendCharts, UserFilled, Warning } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import request from '../utils/request'
import XiaoyeOwl from '../components/XiaoyeOwl.vue'

const { t, locale } = useI18n()

const rangeMode = ref('7')
const customRange = ref([])
const question = ref('')
const loading = ref(false)
const analysis = ref(null)
const trendChartElement = ref(null)
let trendChart = null

const presets = computed(() => [
  { value: '7', label: t('aiAnalysis.last7Days') },
  { value: '30', label: t('aiAnalysis.last30Days') },
  { value: 'custom', label: t('aiAnalysis.customRange') }
])

const quickQuestions = computed(() => [
  t('aiAnalysis.quickQuestion1'),
  t('aiAnalysis.quickQuestion2'),
  t('aiAnalysis.quickQuestion3')
])

const statCards = computed(() => {
  const snapshot = analysis.value?.snapshot || {}
  return [
    { key: 'totalRecords', label: t('aiAnalysis.totalRecords'), value: snapshot.totalRecords ?? 0 },
    { key: 'normalRate', label: t('aiAnalysis.normalRate'), value: snapshot.normalRate ?? 0, suffix: '%' },
    { key: 'late', label: t('aiAnalysis.late'), value: snapshot.late ?? 0 },
    { key: 'absent', label: t('aiAnalysis.absent'), value: snapshot.absent ?? 0 },
    { key: 'openHazards', label: t('aiAnalysis.openHazards'), value: snapshot.openHazards ?? 0 }
  ]
})

const pad = value => String(value).padStart(2, '0')
const formatDate = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const selectPreset = value => {
  rangeMode.value = value
}

const getRequestRange = () => {
  if (rangeMode.value === 'custom') {
    if (!customRange.value || customRange.value.length !== 2) return null
    return { startDate: customRange.value[0], endDate: customRange.value[1] }
  }

  const end = new Date()
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  start.setDate(start.getDate() - Number(rangeMode.value) + 1)
  return { startDate: formatDate(start), endDate: formatDate(end) }
}

const disableFutureDate = date => date.getTime() > Date.now()

const generateAnalysis = async () => {
  const range = getRequestRange()
  if (!range) {
    ElMessage.warning(t('aiAnalysis.selectRange'))
    return
  }

  loading.value = true
  try {
    const response = await request.post('/ai/analysis', {
      ...range,
      question: question.value.trim(),
      language: locale.value
    }, { timeout: 70000 })

    if (response.code !== 200) {
      ElMessage.error(response.message || t('aiAnalysis.requestError'))
      return
    }
    analysis.value = response.data
    await nextTick()
    renderTrendChart()
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || t('aiAnalysis.requestError'))
  } finally {
    loading.value = false
  }
}

const renderTrendChart = () => {
  if (!trendChartElement.value || !analysis.value) return
  trendChart?.dispose()
  trendChart = echarts.init(trendChartElement.value)
  const data = analysis.value.dailyTrend || []
  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: {
      data: [t('aiAnalysis.late'), t('aiAnalysis.absent')],
      left: 'center',
      bottom: 0
    },
    grid: { left: 40, right: 20, top: 28, bottom: 64, containLabel: true },
    xAxis: {
      type: 'category',
      data: data.map(item => String(item.date).slice(5)),
      axisLabel: { color: '#777', interval: data.length > 31 ? 6 : data.length > 14 ? 2 : 0 }
    },
    yAxis: { type: 'value', minInterval: 1, axisLabel: { color: '#777' } },
    series: [
      { name: t('aiAnalysis.late'), type: 'line', smooth: true, data: data.map(item => item.late), itemStyle: { color: '#f59e0b' } },
      { name: t('aiAnalysis.absent'), type: 'line', smooth: true, data: data.map(item => item.absent), itemStyle: { color: '#ef4444' } }
    ]
  })
}

const riskText = level => {
  const map = { HIGH: t('aiAnalysis.high'), MEDIUM: t('aiAnalysis.medium'), LOW: t('aiAnalysis.low') }
  return map[level] || level
}

const anomalyStatusText = status => status === 'ABSENT'
  ? t('aiAnalysis.absentStatus')
  : t('aiAnalysis.lateStatus')

const formatDateTime = value => value ? String(value).replace('T', ' ').slice(0, 19) : '-'

const handleResize = () => trendChart?.resize()
window.addEventListener('resize', handleResize)

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
})
</script>

<style scoped>
.ai-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.hero-card,
.control-card,
.content-card,
.empty-state {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 14px;
}

.hero-card {
  padding: 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  background: linear-gradient(135deg, #0b0b0b, #27272a);
  color: #fff;
  position: relative;
  overflow: hidden;
}

.hero-text {
  flex: 1;
  min-width: 0;
}

.hero-owl {
  flex: 0 0 160px;
  height: 160px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.owl-name {
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  font-weight: 600;
  color: #c4b5fd;
  letter-spacing: 2px;
  white-space: nowrap;
}

.eyebrow {
  color: #a1a1aa;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 2px;
  margin-bottom: 10px;
}

.hero-card h1 {
  margin: 0 0 8px;
  font-size: 28px;
}

.hero-card p {
  margin: 0;
  max-width: 650px;
  color: #d4d4d8;
  line-height: 1.7;
}

.privacy-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  max-width: 340px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  color: #d4d4d8;
  font-size: 12px;
  line-height: 1.6;
}

.privacy-icon {
  width: 16px;
  flex: 0 0 auto;
  margin-top: 2px;
}

.control-card {
  padding: 24px;
}

.preset-row,
.quick-questions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.preset-btn,
.quick-questions button {
  border: 1px solid #dedede;
  background: #fff;
  border-radius: 8px;
  padding: 9px 16px;
  cursor: pointer;
  color: #555;
}

.preset-btn.active {
  background: #111;
  border-color: #111;
  color: #fff;
}

.field-group {
  margin-top: 20px;
}

.field-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 9px;
}

.date-field :deep(.el-date-editor) {
  max-width: 420px;
}

.quick-questions {
  margin-top: 10px;
}

.quick-questions button {
  padding: 7px 11px;
  font-size: 12px;
  background: #f8f8f8;
}

.quick-questions button:hover {
  border-color: #111;
  color: #111;
}

.generate-btn {
  margin-top: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 180px;
  padding: 12px 20px;
  border: 0;
  border-radius: 9px;
  background: #111;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.generate-btn:disabled {
  opacity: 0.65;
  cursor: wait;
}

.generate-btn svg {
  width: 17px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.result-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 20px;
  color: #777;
  font-size: 12px;
}

.provider-badge {
  padding: 6px 10px;
  border-radius: 999px;
  background: #dcfce7;
  color: #166534;
  font-weight: 700;
}

.provider-badge.fallback {
  background: #fef3c7;
  color: #92400e;
}

.fallback-notice {
  padding: 12px 16px;
  border: 1px solid #fde68a;
  border-radius: 10px;
  background: #fffbeb;
  color: #92400e;
  font-size: 13px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
}

.stat-card {
  padding: 20px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
}

.stat-label {
  display: block;
  color: #777;
  font-size: 12px;
  margin-bottom: 10px;
}

.stat-card strong {
  color: #111;
  font-size: 28px;
}

.stat-card small {
  margin-left: 2px;
  font-size: 14px;
}

.report-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: 20px;
}

.content-card {
  padding: 24px;
}

.card-heading {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 18px;
}

.card-heading svg {
  width: 19px;
}

.card-heading h2 {
  margin: 0;
  font-size: 17px;
}

.report-content {
  white-space: pre-wrap;
  color: #333;
  font-size: 14px;
  line-height: 1.9;
}

.risk-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.risk-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px;
  border-radius: 9px;
  background: #f8f8f8;
}

.risk-item div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.risk-item strong {
  font-size: 14px;
}

.risk-item div span {
  color: #888;
  font-size: 12px;
}

.risk-tag {
  flex: 0 0 auto;
  padding: 5px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
}

.risk-tag.high { background: #fee2e2; color: #b91c1c; }
.risk-tag.medium { background: #fef3c7; color: #92400e; }
.risk-tag.low { background: #dcfce7; color: #166534; }

.empty-risk {
  padding: 30px 10px;
  color: #999;
  text-align: center;
  font-size: 13px;
}

.anomaly-table-wrap {
  width: 100%;
  overflow-x: auto;
}

.anomaly-table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
  color: #444;
  font-size: 13px;
}

.anomaly-table th,
.anomaly-table td {
  padding: 12px 14px;
  border-bottom: 1px solid #eeeeee;
  text-align: left;
  vertical-align: middle;
}

.anomaly-table th {
  background: #fafafa;
  color: #777;
  font-size: 12px;
  font-weight: 600;
}

.anomaly-table tbody tr:hover {
  background: #fcfcfc;
}

.status-tag {
  display: inline-flex;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
}

.status-tag.late { background: #fef3c7; color: #92400e; }
.status-tag.absent { background: #fee2e2; color: #b91c1c; }

.trend-chart {
  width: 100%;
  height: 320px;
}

.empty-state {
  padding: 64px 24px;
  text-align: center;
  color: #777;
}

.empty-state > svg {
  width: 42px;
  color: #111;
}

.empty-state h2 {
  margin: 18px 0 8px;
  color: #222;
  font-size: 19px;
}

.empty-state p {
  margin: 0;
  font-size: 13px;
}

@media (max-width: 900px) {
  .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .report-grid { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .hero-card { padding: 22px; flex-direction: column; align-items: center; text-align: center; }
  .hero-owl { flex: 0 0 120px; height: 120px; order: -1; }
  .hero-card h1 { font-size: 23px; }
  .privacy-note { max-width: none; }
  .control-card, .content-card { padding: 18px; }
  .stats-grid { gap: 10px; }
  .stat-card { padding: 15px; }
  .stat-card strong { font-size: 23px; }
  .generate-btn { width: 100%; }
  .date-field :deep(.el-date-editor) { width: 100%; }
  .trend-chart { height: 260px; }
}
</style>
