/**
 * Created by yuliang on 2017/9/22.
 */

'use strict'

const queue = require('async/queue')
const fsmEventHandler = require('../contract-service/contract-fsm-event-handler')

module.exports = class SettlementTimerTaskQueue {

    constructor(concurrencyCount = 20) {
        this.concurrencyCount = concurrencyCount
        this.queue = queue(this.taskHandler, concurrencyCount)
    }

    /**
     * 添加待触发对象到队列
     * @param contractEvents
     */
    push(contractEvents) {
        if (Array.isArray(contractEvents)) {
            contractEvents.forEach(event => this.queue.push(event))
        } else if (contractEvents) {
            this.queue.push(contractEvents)
        }
    }

    /**
     * 暂停执行
     */
    pause() {
        this.queue.pause()
    }

    /**
     * 继续执行
     */
    resume() {
        this.queue.resume()
    }

    /**
     * 获取队列状态
     * @returns {{started: (*|boolean), paused: (*|boolean), saturated: (*|Function)}}
     */
    get queueState() {
        return {
            started: this.queue.started,
            paused: this.queue.paused,
            saturated: this.queue.saturated,
        }
    }

    /**
     * 处理函数
     * @param task
     * @param doneCallBack doneCallBack
     */
    async taskHandler(contractEvent, doneCallBack) {
        await fsmEventHandler.contractEventTriggerHandler(contractEvent.eventId, contractEvent.contractId, contractEvent.eventParams)
        doneCallBack()
    }
}

