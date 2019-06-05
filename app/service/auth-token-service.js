'use strict'

const lodash = require('lodash')
const Service = require('egg').Service

module.exports = class AuthTokenService extends Service {

    constructor({app}) {
        super(...arguments)
        this.authTokenProvider = app.dal.authTokenProvider
    }

    /**
     * 保存用户的presentable授权结果
     * @param presentableAuthTree
     * @param userId
     * @param authResult
     * @returns {Promise<*>}
     */
    async saveUserPresentableAuthResult({presentableInfo, userId, authResult}) {

        const {presentableId, releaseInfo} = presentableInfo

        const model = {
            partyTwo: userId,
            partyTwoUserId: userId,
            targetId: presentableId,
            targetVersion: releaseInfo.version,
            identityType: 3,
            authCode: authResult.authCode,
            authReleaseIds: [releaseInfo.releaseId],
            expire: Math.round(new Date().getTime() / 1000) + 1296000,
            signature: '待完成'
        }

        return this.authTokenProvider.createAuthToken(model)
    }

    /**
     * 保存节点的presentable授权方案授权结果
     * @param presentableInfo
     * @param presentableAuthTree
     * @param nodeInfo
     * @param authResult
     * @returns {Promise<*>}
     */
    async saveNodePresentableAuthResult({presentableInfo, presentableAuthTree, authResult}) {

        const {authTree} = presentableAuthTree
        const {presentableId, nodeId, userId, releaseInfo} = presentableInfo

        const model = {
            partyTwo: nodeId,
            partyTwoUserId: userId,
            targetId: presentableId,
            targetVersion: releaseInfo.version,
            identityType: 2,
            authCode: authResult.authCode,
            authReleaseIds: lodash.chain(authTree).filter(x => x.deep === 1).map(x => x.releaseId).uniq().value(),
            expire: Math.round(new Date().getTime() / 1000) + 172800,  //基于资源的授权token缓存2天
            signature: '待完成'
        }

        return this.authTokenProvider.createAuthToken(model)
    }

    /**
     * 保存发行方案授权结果
     * @returns {Promise<void>}
     */
    async saveReleaseAuthResult({releaseScheme, userInfo, authResult}) {

        const {releaseId, version, resolveReleases} = releaseScheme

        const model = {
            partyTwo: userInfo.userId,
            partyTwoUserId: userInfo.userId,
            targetId: releaseId,
            targetVersion: version,
            identityType: 1,
            authCode: authResult.authCode,
            authReleaseIds: lodash.chain(resolveReleases).map(x => x.releaseId).uniq().value(),
            expire: Math.round(new Date().getTime() / 1000) + 172800,  //基于资源的授权token缓存2天
            signature: '待完成'
        }

        return this.authTokenProvider.createAuthToken(model)
    }

    /**
     * 获取有效的授权Token
     * @param targetId
     * @param targetVersion
     * @param identityType
     * @param partyTwo
     * @param partyTwoUserId
     * @returns {Promise<*>}
     */
    async getAuthToken({targetId, targetVersion, identityType, partyTwo, partyTwoUserId}) {
        return this.authTokenProvider.getEffectiveAuthToken({
            targetId, targetVersion, partyTwoUserId, identityType, partyTwo: partyTwo.toString()
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
        return this.authTokenProvider.getEffectiveAuthToken({
            _id: token,
            partyTwoUserId,
            partyTwo: partyTwo.toString()
        })
    }
}