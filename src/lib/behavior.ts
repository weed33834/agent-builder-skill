/**
 * 行为轨迹采集器 —— 移植自原 app.js BehaviorTracker。
 * 记录单题作答时长、改动次数、改动轨迹(t, value),供冲突检测/行为洞察使用。
 * 纯类,无 React 依赖;Take 页用 useRef 持有实例,跨题 start() 重置。
 */
export class BehaviorTracker {
  private startTime = 0
  private changeCount = 0
  private trajectory: { t: number; value: unknown }[] = []

  start(): void {
    this.startTime = performance.now()
    this.changeCount = 0
    this.trajectory = []
  }

  recordChange(value: unknown): void {
    this.changeCount++
    this.trajectory.push({ t: performance.now() - this.startTime, value })
  }

  snapshot(): { duration_ms: number; change_count: number; trajectory: unknown[] | null } {
    return {
      duration_ms: Math.round(performance.now() - this.startTime),
      change_count: this.changeCount,
      trajectory: this.trajectory.length ? this.trajectory : null,
    }
  }
}
