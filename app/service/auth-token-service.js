/**
 * 授权结果缓存服务
 */

'use strict'

const Service = require('egg').Service

module.exports = class AuthTokenService extends Service {

    /**
     * 保存用户的presentable授权结果
     * @param presentableAuthTree
     * @param userInfo
     * @param nodeInfo
     * @returns {Promise<void>}
     */
    async savePresentableAuthResult({presentableAuthTree, userId, nodeInfo, authResult}) {

        if (!authResult.isAuth) {
            return
        }

        const {ctx, app} = this

        const model = {
            partyOne: presentableAuthTree.nodeId,
            targetId: presentableAuthTree.presentableId,
            partyTwo: userId.toString(),
            partyTwoUserId: userId,
            contractType: app.contractType.PresentableToUer,
            authCode: authResult.authCode,
            masterResourceId: presentableAuthTree.masterResourceId,
            authResourceIds: presentableAuthTree.authTree.map(x => x.resourceId),
            expire: Math.round(new Date().getTime() / 1000) + 1296000,
            signature: '待完成'
        }

        return ctx.dal.authTokenProvider.createAuthToken(model)
    }

    /**
     * 保存资源授权结果
     * @returns {Promise<void>}
     */
    async saveResourceAuthResult({resourceId, authSchemeId, userId, nodeInfo, authResult}) {

        if (!authResult.isAuth) {
            return
        }

        const {ctx} = this

        const model = {
            partyOne: authSchemeId,
            targetId: resourceId,
            partyTwo: nodeInfo ? nodeInfo.nodeId : userId,
            partyTwoUserId: userId,
            contractType: 0, //资源不通过合同,直接授权使用.
            authCode: authResult.authCode,
            masterResourceId: resourceId,
            authResourceIds: [resourceId],
            expire: Math.round(new Date().getTime() / 1000) + 172800,  //基于资源的授权token缓存2天
            signature: '待完成'
        }

        return ctx.dal.authTokenProvider.createAuthToken(model)
    }

    /**
     * 获取有效的授权Token
     * @returns {Promise<void>}
     */
    async getAuthToken({targetId, partyTwo, partyTwoUserId}) {

        const {ctx} = this

        return ctx.dal.authTokenProvider.getEffectiveAuthToken({
            targetId,
            partyTwoUserId,
            partyTwo: partyTwo.toString()
        })
    }

    /**
     * 根据ID获取有效的授权token
     * @param token
     * @param partyTwo
     * @param partyTwoUserId
     * @returns {Promise<void>}
     */
    async getAuthTokenById({token, partyTwo, partyTwoUserId}) {

        const {ctx} = this

        return ctx.dal.authTokenProvider.getEffectiveAuthToken({
            _id: token,
            partyTwoUserId,
            partyTwo: partyTwo.toString()
        })
    }
}