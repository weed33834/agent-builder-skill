/**
 * 答题流 —— 9 题型 + QuestionRouter 的编排器(原 take.js)。
 * 独立全屏路由(无 SiteHeader/Footer),复刻原 take.html 聚焦态:
 * 顶部进度条 / 题型徽章 / 倒计时环 / 节奏条 / 题型分段过渡卡 / 题目区。
 *
 * 状态机:loading →(有草稿)draft-resume / (无)running → section-intro ⇄ question
 *        → 全部答完 submitting → 算分 → 跳 report。
 * 草稿/最近结果走 Zustand 持久化(localStorage,无后端)。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useI18n } from '@/lib/i18n'
import { useDocumentMeta } from '@/lib/seo'
import { assessments } from '@/lib/data'
import { fetchBank, qk } from '@/lib/query'
import { filterBank, computeResult } from '@/lib/scoring'
import { loadCelebrities, loadIdeologies } from '@/lib/data'
import { BehaviorTracker } from '@/lib/behavior'
import { play, vibrate } from '@/lib/audio'
import { toast } from '@/lib/toast'
import { useDraftStore, useLastResultStore } from '@/store'
import type { Answer, AnswerRecord, AssessmentType, AssessmentVersion, QuestionBank } from '@/lib/types'
import { QuestionRouter } from '@/components/questions/QuestionRouter'
import { SectionIntro } from '@/components/questions/SectionIntro'
import { asset } from '@/lib/utils'

type AnsRecord = AnswerRecord & { _timeout?: boolean }

const VALID_TYPES: AssessmentType[] = ['celebrity', 'value', 'ideology']
const CIRC = 175.93 // 2πr, r=28

export default function Take() {
  const { type: rawType } = useParams<{ type: string }>()
  const type = (VALID_TYPES.includes(rawType as AssessmentType) ? rawType : null) as AssessmentType | null
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t, lang } = useI18n()

  const version = useMemo<AssessmentVersion>(() => {
    const v = searchParams.get('version')
    return v === 'fast' || v === 'deep' ? v : 'standard'
  }, [searchParams])

  const a = assessments.find((x) => x.type === type)
  const metaVars = useMemo(() => ({ name: a?.title || '' }), [a?.title])
  useDocumentMeta({ page: 'take', vars: metaVars })

  const { data: bank, error } = useQuery({
    queryKey: type ? qk.bank(type) : ['bank', 'none'],
    queryFn: () => fetchBank(type as AssessmentType),
    enabled: !!type,
  })
  const filteredBank = useMemo<QuestionBank | undefined>(() => (bank ? filterBank(bank, version) : undefined), [bank, version])

  // ---- 状态 ----
  const trackerRef = useRef<BehaviorTracker>(new BehaviorTracker())
  const getAnswerRef = useRef<() => Answer>(() => ({}))
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<AnsRecord[]>([])
  const [lastType, setLastType] = useState<string | null>(null)
  const [phase, setPhase] = useState<'loading' | 'draft-resume' | 'running' | 'submitting' | 'error'>('loading')
  const [remaining, setRemaining] = useState(0)
  const [timerActive, setTimerActive] = useState(false)
  const [urgent, setUrgent] = useState(false)
  const [rhythm, setRhythm] = useState({ sec: 0, changes: 0 })
  const [draftCount, setDraftCount] = useState(0)

  // 稳定回调用的镜像 ref
  const idxRef = useRef(currentIdx); idxRef.current = currentIdx
  const answersRef = useRef(answers); answersRef.current = answers
  const phaseRef = useRef(phase); phaseRef.current = phase
  const submittingRef = useRef(false)
  const leaveGuardOffRef = useRef(false)
  const startedAtRef = useRef(Date.now())

  const q = filteredBank?.questions[currentIdx]
  const showIntro = phase === 'running' && !!q && lastType !== q.type

  // 题型分布(用于题型徽章与分段序号)
  const typeIndex = useMemo(() => {
    if (!filteredBank) return { idx: {} as Record<string, number[]>, count: {} as Record<string, number>, order: [] as string[] }
    const idx: Record<string, number[]> = {}
    const count: Record<string, number> = {}
    filteredBank.questions.forEach((qq, i) => {
      ;(idx[qq.type] = idx[qq.type] || []).push(i)
      count[qq.type] = (count[qq.type] || 0) + 1
    })
    return { idx, count, order: Object.keys(idx) }
  }, [filteredBank])

  // ---- 无效类型 → 回首页 ----
  useEffect(() => {
    if (!type) navigate('/', { replace: true })
  }, [type, navigate])

  // ---- 主题色 ----
  useEffect(() => {
    if (type) document.body.dataset.mirror = type
    return () => { delete document.body.dataset.mirror }
  }, [type])

  // ---- 初始化:题库就绪后查草稿 ----
  useEffect(() => {
    if (!filteredBank || phase !== 'loading' || !type) return
    const d = useDraftStore.getState().loadDraft(type)
    const cnt = d ? (d.answers as AnsRecord[]).filter((x) => x).length : 0
    if (cnt > 0) { setDraftCount(cnt); setPhase('draft-resume') }
    else setPhase('running')
  }, [filteredBank, phase, type])

  // ---- 题库加载失败 ----
  useEffect(() => {
    if (error && phase === 'loading') setPhase('error')
  }, [error, phase])

  // ---- 记录答案(稳定回调,读镜像 ref) ----
  const recordAnswer = useCallback((answer: Answer, timeout = false) => {
    const cur = idxRef.current
    const curQ = filteredBank?.questions[cur]
    if (!curQ) return
    if (!timeout) { play('select'); vibrate(12) }
    const snap = trackerRef.current.snapshot()
    if (timeout && curQ.time_limit_sec) snap.duration_ms = curQ.time_limit_sec * 1000 + 100
    const rec: AnsRecord = {
      question_id: curQ.id,
      answer,
      duration_ms: snap.duration_ms,
      change_count: snap.change_count,
      trajectory: snap.trajectory || undefined,
      _timeout: timeout,
    }
    const next = [...answersRef.current]
    next[cur] = rec
    if (type) {
      useDraftStore.getState().saveDraft(type, {
        answers: next, currentIdx: cur + 1, startedAt: startedAtRef.current, version,
      })
    }
    setAnswers(next)
    setCurrentIdx(cur + 1)
  }, [filteredBank, type, version])

  // ---- 单题计时 + 节奏条 ----
  useEffect(() => {
    if (phase !== 'running' || showIntro || !q) return
    trackerRef.current.start()
    setRhythm({ sec: 0, changes: 0 })
    const rhythmT = window.setInterval(() => {
      const s = trackerRef.current.snapshot()
      setRhythm({ sec: Math.round(s.duration_ms / 1000), changes: s.change_count })
    }, 200)

    let timerT = 0
    if (q.time_limit_sec && q.type !== 'iat') {
      setTimerActive(true)
      let r = q.time_limit_sec
      setRemaining(r)
      setUrgent(r <= 5)
      timerT = window.setInterval(() => {
        r -= 1
        setRemaining(r)
        setUrgent(r <= 5)
        if (r <= 0) {
          window.clearInterval(timerT)
          recordAnswer(getAnswerRef.current(), true)
        }
      }, 1000)
    } else {
      setTimerActive(false)
    }
    return () => {
      window.clearInterval(rhythmT)
      if (timerT) window.clearInterval(timerT)
    }
  }, [phase, showIntro, q, recordAnswer])

  // ---- 全部答完 → 提交 ----
  const submitAll = useCallback(async () => {
    if (submittingRef.current) return
    submittingRef.current = true
    setPhase('submitting')
    if (!filteredBank || !type) return
    const valid = answersRef.current.filter((x) => x && (Object.keys(x.answer || {}).length > 0 || x._timeout))
    const payload: AnswerRecord[] = valid.map(({ _timeout, ...rest }) => {
      void _timeout
      return rest
    })
    try {
      const [celebrities, ideologies] = await Promise.all([loadCelebrities(), loadIdeologies()])
      const result = computeResult(type, version, payload, filteredBank, celebrities, ideologies, {})
      play('submit'); vibrate([20, 30, 20])
      const share = btoa(unescape(encodeURIComponent(JSON.stringify({ type, result }))))
      useLastResultStore.getState().setLastResult(share)
      useDraftStore.getState().clearDraft(type)
      leaveGuardOffRef.current = true
      navigate(`/report/${type}?r=${encodeURIComponent(share)}`)
    } catch (e) {
      console.error(e)
      submittingRef.current = false
      setPhase('running')
      toast(t('common.submit_failed'), 'error')
    }
  }, [filteredBank, type, version, navigate, t])

  useEffect(() => {
    if (phase === 'running' && filteredBank && currentIdx >= filteredBank.questions.length) {
      submitAll()
    }
  }, [phase, currentIdx, filteredBank, submitAll])

  // ---- 草稿恢复 / 重开 ----
  const continueDraft = () => {
    if (!type || !filteredBank) return
    const d = useDraftStore.getState().loadDraft(type)
    if (d) {
      const ans = (d.answers || []) as AnsRecord[]
      setAnswers(ans)
      const nextIdx = filteredBank.questions.findIndex((_, i) => !ans[i])
      setCurrentIdx(nextIdx < 0 ? filteredBank.questions.length : nextIdx)
    }
    setLastType(null)
    setPhase('running')
  }
  const restartDraft = () => {
    if (type) useDraftStore.getState().clearDraft(type)
    setAnswers([]); setCurrentIdx(0); setLastType(null); setPhase('running')
  }

  // ---- 离开确认(草稿已实时存,二次确认防误触) ----
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (leaveGuardOffRef.current) return
      const answered = answersRef.current.filter((x) => x && x.answer && Object.keys(x.answer).length > 0).length
      if (answered > 0) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  // ---- 渲染辅助 ----
  const total = filteredBank?.questions.length || 0
  const pct = total ? (currentIdx / total) * 100 : 0
  const posInType = q ? (typeIndex.idx[q.type]?.indexOf(currentIdx) ?? -1) + 1 : 0
  const typeCount = q ? typeIndex.count[q.type] || 0 : 0
  const phaseNumber = q ? typeIndex.order.indexOf(q.type) + 1 : 0
  const mirrorName = type ? t<string>(`take.title_${type}`) : ''
  const timerRatio = q && q.time_limit_sec ? remaining / q.time_limit_sec : 0

  return (
    <div className="container">
      <div className="take-header">
        <Link to="/" className="back-link">{t('common.exit')}</Link>
        <span className="title-label">{mirrorName}</span>
      </div>

      {phase !== 'submitting' && (
        <>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
          <div className="progress-text">
            {q ? (
              <>
                <span className="num">{currentIdx + 1}</span> / {total}
                <span className="type-badge">
                  <img src={asset(`/images/methods/${q.type}.svg`)} className="type-badge-icon" alt="" width={12} height={12} aria-hidden="true" />
                  {t<string>(`take.type_label.${q.type}`)} {posInType}/{typeCount}
                </span>
              </>
            ) : (
              <span className="num">{Math.min(currentIdx, total)} / {total}</span>
            )}
          </div>
        </>
      )}

      {timerActive && phase === 'running' && !showIntro && (
        <div className={`timer-ring${urgent ? ' urgent' : ''}`}>
          <svg width="64" height="64">
            <circle className="track" cx="32" cy="32" r="28" fill="none" strokeWidth={2} />
            <circle className="fill" cx="32" cy="32" r="28" fill="none" strokeWidth={2}
              strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - timerRatio)} />
          </svg>
          <div className="num">{remaining}</div>
        </div>
      )}

      {phase === 'running' && !showIntro && q && (
        <div className={`rhythm-bar${rhythm.sec >= 8 ? ' peak' : ''}`}>
          <span className="rhythm-label">{t('take.rhythm')}</span>
          <span className="rhythm-time">{rhythm.sec}s</span>
          <span className="rhythm-changes">{rhythm.changes > 0 ? '×' + rhythm.changes : ''}</span>
        </div>
      )}

      {lang !== 'zh' && phase === 'running' && (
        <div className="i18n-notice">{t('common.notice_i18n_partial')}</div>
      )}

      <div id="question-area">
        {phase === 'loading' && (
          <div className="figure-loading">
            <div className="mirror-disc" />
            <p>{t('common.loading')}</p>
          </div>
        )}

        {phase === 'error' && (
          <div className="load-error" role="alert">
            <p className="load-error-title">{t('take.load_failed')}</p>
            <p className="load-error-desc">{t('take.load_failed_sub')}</p>
            <button className="btn-primary" type="button" onClick={() => location.reload()}>{t('common.retry')}</button>
          </div>
        )}

        {phase === 'draft-resume' && (
          <div className="loading-overlay draft-resume" style={{ position: 'fixed' }}>
            <div className="mirror-disc" data-clarity="low" />
            <p>{t('take.draft_resume_title', { n: draftCount })}</p>
            <p className="loading-sub">{t('take.draft_resume_sub')}</p>
            <div className="draft-actions">
              <button className="btn-primary" type="button" onClick={continueDraft}>{t('take.draft_continue')}</button>
              <button className="btn-link" type="button" onClick={restartDraft}>{t('take.draft_restart')}</button>
            </div>
          </div>
        )}

        {phase === 'submitting' && (
          <div className="loading-overlay" style={{ position: 'fixed' }}>
            <div className="mirror-disc" data-clarity="high" />
            <p>{t('common.processing')}</p>
            <p className="loading-sub">{t('common.processing_sub')}</p>
          </div>
        )}

        {phase === 'running' && q && showIntro && (
          <SectionIntro type={q.type} phaseNumber={phaseNumber} onStart={() => setLastType(q.type)} />
        )}

        {phase === 'running' && q && !showIntro && (
          <div key={currentIdx}>
            <QuestionRouter
              question={q}
              tracker={trackerRef.current}
              onAnswer={recordAnswer}
              getAnswerRef={getAnswerRef}
            />
          </div>
        )}
      </div>
    </div>
  )
}
