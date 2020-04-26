'use strict'

const Service = require('egg').Service
const authCodeEnum = require('../enum/auth-code')
const AuthService = require('../authorization-service/process-manager')
const commonAuthResult = require('../authorization-service/common-auth-result')
const releasePolicyCompiler = require('egg-freelog-base/app/extend/policy-compiler/release-policy-compiler')

module.exports = class UserContractAuthService extends Service {

    constructor({app}) {
        super(...arguments)
        this.authService = new AuthService(app)
        this.contractProvider = app.dal.contractProvider
    }

    /**
     * 用户合同授权
     * @param presentableInfo
     * @returns {Promise<void>}
     */
    async userContractAuth(presentableInfo, userInfo) {

        if (userInfo) {
            const authResult = await this._loginUserPresentableContractAuth(presentableInfo, userInfo)
            this._saveUserContractAuthResult(presentableInfo, userInfo.userId, authResult)
            return authResult
        }

        var unLoginUserAuthResult = await this._unLoginUserPresentablePolicyAuth(presentableInfo)
        if (!unLoginUserAuthResult.isAuth) {
            unLoginUserAuthResult.authCode = authCodeEnum.UnLoginUser
        }

        return unLoginUserAuthResult
    }

    /**
     * 登录用户合同授权
     * @param presentableInfo
     * @returns {Promise<void>}
     * @private
     */
    async _loginUserPresentableContractAuth(presentableInfo, userInfo) {

        const {ctx, app, authService} = this
        const {presentableId} = presentableInfo

        const authToken = await ctx.service.authTokenService.getAuthToken({
            targetId: presentableId, identityType: 3, partyTwo: userInfo.userId,
        })
        if (authToken) {
            return new commonAuthResult(authToken.authCode, {authToken})
        }

        const defaultExecContract = await this.contractProvider.findOne({
            targetId: presentableInfo.presentableId, partyTwo: userInfo.userId, isDefault: 1,
            contractType: app.contractType.PresentableToUser
        })

        if (defaultExecContract) {
            return authService.contractAuthorization({contract: defaultExecContract, partyTwoUserInfo: userInfo})
        }

        const freeContractInfo = await this._tryCreateFreeUserContract(presentableInfo, userInfo)

        return new commonAuthResult(freeContractInfo ? authCodeEnum.BasedOnUserContract : authCodeEnum.NotFoundUserPresentableContract)
    }

    /**
     * 尝试创建免费合同
     * @param presentableInfo
     * @param userInfo
     * @returns {Promise<void>}
     * @private
     */
    async _tryCreateFreeUserContract(presentableInfo, userInfo) {

        const {ctx, app, authService} = this
        const {presentableId, policies, nodeId} = presentableInfo
        const contractType = app.contractType.PresentableToUser

        const policySegments = policies.filter(x => x.status === 1).map(policyInfo => releasePolicyCompiler.compile(policyInfo.policyText))

        const policyAuthResult = await authService.policyAuthorization({
            policySegments, contractType,
            partyOneUserId: presentableInfo.userId,
            partyTwoUserInfo: userInfo
        })
        if (!policyAuthResult.isAuth) {
            return null
        }

        const {policySegment} = policyAuthResult.data
        const contractModel = {
            policySegment, nodeId,
            isDefault: 1,
            policyId: policySegment.policyId,
            targetId: presentableId,
            partyOne: nodeId,
            partyTwo: userInfo.userId,
            partyOneUserId: presentableInfo.userId,
            partyTwoUserId: userInfo.userId,
            contractName: policySegment.policyName,
            contractType: app.contractType.PresentableToUser
        }

        return app.contractService.createContract(ctx, contractModel, true)
    }

    /**
     * 未登陆用户尝试获取presentable授权(满足initial-terminate模式)
     * @returns {Promise<void>}
     */
    async _unLoginUserPresentablePolicyAuth(presentableInfo) {

        const {app, authService} = this
        const {policies, userId} = presentableInfo

        const policySegments = policies.filter(x => x.status === 1).map(policyInfo => releasePolicyCompiler.compile(policyInfo.policyText))

        return authService.policyAuthorization({
            policySegments,
            contractType: app.contractType.PresentableToUser,
            partyOneUserId: userId,
            partyTwoUserInfo: null
        })
    }

    /**
     * 保存用户合同授权结果
     * @param presentableInfo
     * @param userId
     * @param authResult
     * @private
     */
    _saveUserContractAuthResult(presentableInfo, userId, authResult) {

        if (!authResult.isAuth || authResult.data.authToken) {
            return
        }

        return this.ctx.service.authTokenService.saveUserPresentableAuthResult({
            presentableInfo, userId, authResult
        }).catch(error => {
            console.error('saveUserPresentableAuthResult-error', error)
        })
    }
}