/**
 * Created by yuliang on 2017/9/20.
 */

'use strict'

const FsmStateSubject = require('./fsm-state-subject')
const FsmStateChangedObserver = require('./fsm-state-changed-observer')
const FsmEventRegsiterObserver = require('./fsm-event-register-observer')
const FsmEventUnRegsiterObserver = require('./fsm-event-unregister-observer')
module.exports = {

    /**
     * 初始化合同状态机状态转移主题观察者
     * @returns {*}
     */
    initFsmStateSubject(){
        let subject = new FsmStateSubject()

        new FsmStateChangedObserver(subject)
        new FsmEventRegsiterObserver(subject)
        new FsmEventUnRegsiterObserver(subject)

        return subject
    }
}