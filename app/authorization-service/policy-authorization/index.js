'use strict'

const ReleasePolicyAuth = require('./release-policy-auth')
const PresentablePolicyAuth = require('./presentable-policy-auth')

module.exports = class ReleaseAndPresentablePolicyAuthHandler {

    constructor(app) {
        this.app = app
    }

    /**
     * 合同授权检查(step1:检查合同本身的状态  step2:检查用户对象是否依然符合策略)
     * @param policySegment
     * @param policyType 1:发行策略 2:presentable策略
     * @param partyOneUserId
     * @param partyTwoInfo 节点信息 如果是针对节点的策略才需要此参数
     * @param partyTwoUserInfo
     * @returns {Promise<*>}
     */
    async handle({policySegment, policyType, partyOneUserId, partyTwoInfo, partyTwoUserInfo}) {

        const {app} = this

        if (policyType === 1) {
            return new ReleasePolicyAuth(app).handle(...arguments)
        }

        return new PresentablePolicyAuth(app).handle(...arguments)
    }
}