/**
 * 题型路由 —— 按 q.type 分发到 9 个题型组件之一(原 renderers 映射)。
 * 题型组件自管交互,通过 onAnswer 提交、getAnswerRef 暴露半成品答案。
 */
import type { Question } from '@/lib/types'
import type { QuestionProps } from './types'
import { ScaleQuestion } from './ScaleQuestion'
import { DilemmaQuestion } from './DilemmaQuestion'
import { AllocationQuestion } from './AllocationQuestion'
import { SortQuestion } from './SortQuestion'
import { IATQuestion } from './IATQuestion'
import { SliderQuestion } from './SliderQuestion'
import { ForcedChoiceQuestion } from './ForcedChoiceQuestion'
import { MatrixQuestion } from './MatrixQuestion'
import { AuctionQuestion } from './AuctionQuestion'

export function QuestionRouter(props: QuestionProps<Question>) {
  const q = props.question
  switch (q.type) {
    case 'scale': return <ScaleQuestion {...props} question={q} />
    case 'dilemma': return <DilemmaQuestion {...props} question={q} />
    case 'allocation': return <AllocationQuestion {...props} question={q} />
    case 'sort': return <SortQuestion {...props} question={q} />
    case 'iat': return <IATQuestion {...props} question={q} />
    case 'slider': return <SliderQuestion {...props} question={q} />
    case 'forced_choice': return <ForcedChoiceQuestion {...props} question={q} />
    case 'matrix': return <MatrixQuestion {...props} question={q} />
    case 'auction': return <AuctionQuestion {...props} question={q} />
    default: return null
  }
}
