/**
 * 题型组件公共契约 —— 9 题型组件 + QuestionRouter 共用。
 *
 * 设计:每题组件自管交互状态,完成后调 onAnswer 提交;为支持单题倒计时
 * 超时回传"当前半成品答案",组件通过 getAnswerRef 注册一个 getter,
 * 由 Take 页的计时器在归零时读取(等价于原 take.js 的 getCurrentAnswer)。
 */
import type { ReactNode } from 'react'
import type { BehaviorTracker } from '@/lib/behavior'
import type { Answer, Question } from '@/lib/types'

export type AnswerGetter = () => Answer

export interface QuestionProps<Q extends Question = Question> {
  question: Q
  tracker: BehaviorTracker
  /** 提交本题答案。timeout=true 表示由倒计时归零触发(保留半成品,供冲突检测)。 */
  onAnswer: (answer: Answer, timeout?: boolean) => void
  /** 组件注册"读取当前答案"的 getter,供计时器超时回调用。 */
  getAnswerRef: { current: AnswerGetter }
}

/** 题型组件统一签名:接收窄化后的题目类型。 */
export type QuestionComponent<Q extends Question> = (props: QuestionProps<Q>) => ReactNode
