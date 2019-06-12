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
            targetId: presentableId,
            targetVersion: releaseInfo.version,
            identityType: 3,
            authCode: authResult.authCode,
            authReleaseIds: [releaseInfo.releaseId],
            expire: this.getTokenExpireDate(3)
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
        const {presentableId, nodeId, releaseInfo} = presentableInfo

        const model = {
            partyTwo: nodeId,
            targetId: presentableId,
            targetVersion: releaseInfo.version,
            identityType: 2,
            authCode: authResult.authCode,
            authReleaseIds: lodash.chain(authTree).filter(x => x.deep === 1).map(x => x.releaseId).uniq().value(),
            expire: this.getTokenExpireDate(2)
        }

        return this.authTokenProvider.createAuthToken(model)
    }

    /**
     * 保存发行方案授权结果
     * @param releaseScheme
     * @param authResult
     * @returns {Promise<*>}
     */
    async saveReleaseSchemeAuthResult(releaseScheme, authResult) {

        const {releaseId, schemeId, version, resolveReleases} = releaseScheme

        const model = {
            partyTwo: releaseId,
            targetId: schemeId,
            targetVersion: version,
            identityType: 1,
            authCode: authResult.authCode,
            authReleaseIds: resolveReleases.map(x => x.releaseId),
            expire: this.getTokenExpireDate(1)
        }

        return this.authTokenProvider.createAuthToken(model)
    }

    /**
     * 获取有效的授权Token
     * @param targetId
     * @param targetVersion
     * @param identityType
     * @param partyTwo
     * @returns {Promise<*>}
     */
    async getAuthToken({targetId, targetVersion, identityType, partyTwo}) {

        const condition = lodash.omitBy({
            targetId, targetVersion, identityType, partyTwo
        }, x => x === undefined || x === null)

        return this.authTokenProvider.getEffectiveAuthToken(condition)
    }

    /**
     * 批量获取授权token
     * @param condition
     * @returns {Promise<*>}
     */
    async getAuthTokens(condition) {
        return this.authTokenProvider.getEffectiveAuthTokens(condition)
    }

    /**
     * 获取token有效期
     * @param identityType
     * @returns {Date}
     */
    getTokenExpireDate(identityType) {

        const expireDate = new Date()
        const currHour = expireDate.getHours()
        switch (identityType) {
            case 1:
                expireDate.setHours(currHour + 6)
                break
            case 2:
                expireDate.setHours(currHour + 12)
                break
            case 3:
                expireDate.setHours(currHour + 24)
                break
        }

        return expireDate
    }
}