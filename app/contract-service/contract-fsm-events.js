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
    onEnterState(lifecycle) {
        /**
         * 只有进入新的状态,才会触发注册事件
         * 第一次实例化仍然需要注册initial状态上的事件
         */
        if (Reflect.has(this.contract, 'isFirst') || lifecycle.from !== 'none') {
            fsmStateSubject.contractFsmStateChanged(lifecycle)
        }
    },
    
    /**
     * 无效的Transition请求
     * @param transition
     * @param from
     * @param to
     */
    onInvalidTransition(transition, from, to) {
        console.log(`不被允许执行的transtion:<${transition}>`)
    }
}