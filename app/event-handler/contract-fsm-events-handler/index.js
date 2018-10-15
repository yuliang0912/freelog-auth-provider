'use strict'

const FsmEventStateChangeHandler = require('./fsm-event-state-change-handler')
const FsmEventRegisterUnregisterHandler = require('./fsm-event-register-unregister-handler')

module.exports = class ContractFsmStateChangedEventHandler {

    constructor(app) {
        this.app = app
        this.handlers = this.registerHandler()
    }

    /**
     * 状态机状态主题变更处理函数
     * @param lifecycle
     */
    async handler(lifeCycle) {
        this.handlers.forEach(item => item.handler(lifeCycle))
    }

    /**
     * 注册状态机事件变更处理者
     * @returns {*[]}
     */
    registerHandler() {
        return [
            new FsmEventStateChangeHandler(this.app),
            new FsmEventRegisterUnregisterHandler(this.app)
        ]
    }
}