'use strict'

const authCodeEnum = require('../enum/auth-code')
const commonAuthResult = require('./common-auth-result')
const IdentityAuthHandler = require('./identity-authentication/index')
const ContractAuthHandler = require('./contract-authorization/index')
const PolicyAuthHandler = require('./policy-authorization/index')

module.exports = class AuthServiceHandler {

    constructor(app) {
        this.app = app
        this.policyAuthHandler = new PolicyAuthHandler(app)
        this.identityAuthHandler = new IdentityAuthHandler(app)
        this.contractAuthHandler = new ContractAuthHandler(app)
    }

    /**
     * 获取合同授权结果
     * @param contract
     * @param partyTwoInfo 如果是节点合同,则需要传入nodeInfo,其他类型合同可以不穿此参数
     * @param partyTwoUserInfo
     * @returns {Promise<*>}
     */
    async contractAuthorization({contract, partyTwoInfo, partyTwoUserInfo}) {
        return this.contractAuthHandler.contractAuth(...arguments)
    }


    /**
     * 获取合同测试授权结果
     * @param contract
     * @param partyTwoInfo 如果是节点合同,则需要传入nodeInfo,其他类型合同可以不穿此参数
     * @param partyTwoUserInfo
     * @returns {Promise<*>}
     */
    async contractTestAuthorization({contract, partyTwoInfo, partyTwoUserInfo}) {
        return this.contractAuthHandler.contractTestAuth(...arguments)
    }


    /***
     * 针对策略段尝试获取授权(用户对象满足,策略满足initial-terminate模式)
     * @param policySegment
     * @param policyType 策略类型 1:发行策略 2:presentable策略
     * @param partyOneUserId 甲方用户ID
     * @param partyTwoInfo 只有乙方是节点时,此处才需要传入nodeInfo
     * @param partyTwoUserInfo
     * @returns {Promise<*>}
     */
    async policyAuthorization({policySegments, policyType, partyOneUserId, partyTwoInfo, partyTwoUserInfo}) {

        const authResult = new commonAuthResult(authCodeEnum.BasedOnReleasePolicy)
        const params = {policyType, partyOneUserId, partyTwoInfo, partyTwoUserInfo}

        for (let i = 0, j = policySegments.length; i < j; i++) {
            let policySegment = policySegments[i]
            if (policySegment.status !== 1) {
                continue
            }
            let policyAuthResult = await this.policyAuthHandler.handle(Object.assign({}, params, {policySegment}))
            if (!policyAuthResult.isAuth) {
                continue
            }
            authResult.data.policySegment = policySegment
            authResult.data.policyId = policySegment.policyId
            break
        }

        if (!authResult.data.policySegment) {
            authResult.authCode = authCodeEnum.PolicyAuthFailed
        }

        return authResult
    }

    /**
     * 针对策略尝试对目标对象做认证
     * @param policySegment
     * @param partyOneUserId 甲方用户ID
     * @param partyTwoInfo 只有乙方是节点时,此处才需要传入noedeInfo
     * @param partyTwoUserInfo
     * @returns {Promise<*>}
     */
    async policyIdentityAuthentication({policySegment, partyOneUserId, partyTwoInfo, partyTwoUserInfo}) {
        return this.identityAuthHandler.handle(...arguments)
    }
}