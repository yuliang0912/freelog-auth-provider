/**
 * Created by yuliang on 2017/9/20.
 */

'use strict'

const baseObserver = require('./base-observer')

module.exports = class FsmStateChangedObserver extends baseObserver {
    constructor(subject) {
        super()
        this.subject = subject
        this.fsmLifeCycle = {}
        this.subject.registerObserver(this)
    }

    async update(lifeCycle) {
        this.fsmLifeCycle = lifeCycle
        console.log(`合同状态变更,from:${lifeCycle.from}, to:${lifeCycle.to}`)
        lifeCycle.fsm.contract.status = lifeCycle.to
    }
}