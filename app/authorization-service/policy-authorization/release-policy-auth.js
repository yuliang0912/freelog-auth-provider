'use strict'

const AuthResult = require('../common-auth-result')
const authCodeEnum = require('../../enum/auth-code')
const PolicyIdentityAuthHandler = require('../identity-authentication/index')

module.exports = class ReleasePolicyAuthHandler {

    constructor(app) {
        this.app = app
        this.policyIdentityAuthHandler = new PolicyIdentityAuthHandler(app)
    }

    /**
     * 节点发行策略授权
     * @param policySegment
     * @param partyOneUserId
     * @param partyTwoInfo
     * @param partyTwoUserInfo
     * @returns {Promise<*>}
     */
    async handle(policySegment, partyOneUserId, partyTwoInfo, partyTwoUserInfo) {

        const authResult = new AuthResult(authCodeEnum.BasedOnReleasePolicy, {policySegment})

        const fsmStates = Object.keys(policySegment.fsmStates)
        const isInitialTerminateMode = policySegment.status === 1 && fsmStates.length === 1 && fsmStates.some(m => /^(initial|init)$/i.test(m))

        if (!isInitialTerminateMode) {
            authResult.authCode = authCodeEnum.PolicyAuthFailed
            return authResult
        }

        const policyIdentityAuthResult = await this.policyIdentityAuthHandler.handle({
            policySegment, partyOneUserId, partyTwoInfo, partyTwoUserInfo
        })

        return policyIdentityAuthResult.isAuth ? authResult : policyIdentityAuthResult
    }
}