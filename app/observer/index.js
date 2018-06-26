/**
 * Created by yuliang on 2017/9/20.
 */

'use strict'

const FsmStateSubject = require('./fsm-state-subject')
const FsmStateChangedObserver = require('./fsm-state-changed-observer')
const FsmEventRegsiterObserver = require('./fsm-event-register-observer')
const FsmEventUnRegsiterObserver = require('./fsm-event-unregister-observer')

module.exports = class ContractFsmStateSubjectObserver {

    constructor() {
        this.subject = new FsmStateSubject()
        this.__registerObserver__()
    }

    /**
     * 注册合同状态机状态转移主题观察者
     * @returns {*}
     */
    __registerObserver__() {
        new FsmStateChangedObserver(this.subject)
        new FsmEventRegsiterObserver(this.subject)
        new FsmEventUnRegsiterObserver(this.subject)
    }
}