'use strict'

const uuid = require('uuid')
const lodash = require('lodash')

module.exports = class FreelogPolicy {

    constructor(policy, isInit = false) {
        this.fsmStates = policy.fsmStates
        this.fsmDeclarations = policy.fsmDeclarations
        isInit && this.__initial__()
    }

    /**
     * 初始化
     * @private
     */
    __initial__() {
        lodash.forIn(this.fsmStates, (stateName, stateDescription) => lodash.forIn(stateDescription.transition, (nextState, eventInfo) => {
            eventInfo.eventId = uuid.v4().replace(/-/g, '')
        }))
    }

    /**
     * 获取所有的事件信息
     * @returns {Array}
     */
    get fsmEvents() {
        const events = []
        lodash.forIn(this.fsmStates, (stateName, stateDescription) => lodash.forIn(stateDescription.transition, (nextState, eventInfo) => {
            if (!eventInfo) {
                return
            }
            eventInfo.nextState = nextState
            eventInfo.currentState = stateName
            events.push(eventInfo)
        }))
        return events
    }

    /**
     * 获取所有的激活态
     * @returns {string[]}
     */
    get activatedStates() {
        return Object.keys(this.fsmStates).filter(item => this.fsmStates[item].authorization.some(x => x === 'active'))
    }

    /**
     * 获取所有的激活态
     * @returns {string[]}
     */
    get presentableStates() {
        return Object.keys(this.fsmStates).filter(item => this.fsmStates[item].authorization.some(x => x === 'active'))
    }

    /**
     * 获取所有的终止态
     * @returns {string[]}
     */
    get terminateStates() {
        return Object.keys(this.fsmStates).filter(item => Object.keys(this.fsmStates[item].transition).length === 0)
    }

    /**
     * 获取所有自定义事件申明
     */
    get customEvents() {
        return this.getDeclarationsByType('customEvents')
    }

    /**
     * 获取所有合同账户
     */
    get contractAccounts() {
        return this.getDeclarationsByType('contractAccounts')
    }

    /**
     * 获取所有合同表达式
     */
    get contractExpressions() {
        return this.getDeclarationsByType('contractExpressions')
    }

    getDeclarationsByType(declareType) {
        const declarations = []
        lodash.forIn(this.fsmDeclarations, (declaration, declareName) => {
            if (declaration.declareType === declareType) {
                declaration.declareName = declareName
                declarations.push(declaration)
            }
        })
        return declarations
    }
}