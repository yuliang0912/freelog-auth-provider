/**
 * Created by yuliang on 2017/9/1.
 */

'use strict'

const fsmStateSubject = require('../observer/index').initFsmStateSubject()

module.exports = {

    /**
     * 合同状态改变之后触发的事件
     * 进入新的状态
     */
    onEnterState(lifecycle){
        if (lifecycle.to === this.contract.status) {
            return
        }

        fsmStateSubject.contractFsmStateChanged(lifecycle)
    },
    /**
     * 无效的Transition请求
     * @param transition
     * @param from
     * @param to
     */
    onInvalidTransition (transition, from, to) {
        console.log(`不被允许执行的transtion:<${transition}>`)
    },

    /**
     * 执行命令
     * @param transition
     */
    onTransition(transition){
        //console.log('执行了' + transition.transition)
        //console.log(`exec transition <${transition.transition}> from: <${transition.from}> to: <${transition.to}>`)
    }
}