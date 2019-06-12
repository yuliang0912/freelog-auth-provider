'use strict'

const lodash = require('lodash')
const Service = require('egg').Service
const {ApplicationError} = require('egg-freelog-base/error')

module.exports = class PresentableAuthService extends Service {

    constructor({app}) {
        super(...arguments)
        this.contractProvider = app.dal.contractProvider
    }

    /**
     * presentable全部链路(用户,节点,发行)授权
     * @param presentableInfo
     * @param subReleaseInfo 子依赖(如果对子依赖授权,才需要传递该参数)
     * @param subReleaseVersion 子依赖版本号
     * @returns {Promise<*>}
     */
    async presentableAllChainAuth(presentableInfo, subReleaseInfo, subReleaseVersion) {

        const {ctx} = this
        const {userInfo} = ctx.request.identityInfo
        const {presentableId, releaseInfo, nodeId, userId} = presentableInfo

        const userContractAuthResult = await ctx.service.userContractAuthService.userContractAuth(presentableInfo, userInfo)
        if (!userContractAuthResult.isAuth) {
            return userContractAuthResult
        }

        const nodeInfoTask = ctx.curlIntranetApi(`${ctx.webApi.nodeInfo}/${nodeId}`)
        const presentableAuthTreeTask = ctx.curlIntranetApi(`${ctx.webApi.presentableInfo}/${presentableId}/authTree`)
        const nodeUserInfoTask = ctx.curlIntranetApi(`${ctx.webApi.userInfo}/${userId}`)
        const [nodeInfo, presentableAuthTree, nodeUserInfo] = await Promise.all([nodeInfoTask, presentableAuthTreeTask, nodeUserInfoTask])
        const {authTree} = presentableAuthTree

        let subAuthTreeNode = null
        if (subReleaseInfo && subReleaseVersion) {
            subAuthTreeNode = authTree.find(x => x.releaseId === subReleaseInfo.releaseId && x.version === subReleaseVersion)
            if (!subAuthTreeNode) {
                throw ApplicationError(ctx.gettext('params-validate-failed', 'subReleaseId,subReleaseVersion'))
            }
        }

        const nodeAndReleaseSideAuthResult = await this.presentableNodeAndReleaseSideAuth(presentableInfo, presentableAuthTree, nodeInfo, nodeUserInfo)

        if (nodeAndReleaseSideAuthResult.isAuth && subAuthTreeNode) {
            nodeAndReleaseSideAuthResult.data.subReleases = lodash.chain(authTree).filter(x => x.parentReleaseSchemeId === subAuthTreeNode.releaseSchemeId).map(x => lodash.pick(x, ['releaseId', 'version'])).value()
        } else if (nodeAndReleaseSideAuthResult.isAuth) {
            nodeAndReleaseSideAuthResult.data.subReleases = authTree.filter(x => x.deep === 1 && x.releaseId !== releaseInfo.releaseId).map(x => lodash.pick(x, ['releaseId', 'version']))
        }

        return nodeAndReleaseSideAuthResult
    }

    /**
     * 批量获取presentable发行和节点侧授权结果
     * @param presentableInfos
     * @param nodeInfo 目前需要多个presentable所属当前用的同一个节点,如果业务有调整,去掉限制即可
     * @returns {Promise<void>}
     */
    async batchPresentableNodeAndReleaseSideAuth(presentableInfos, nodeInfo) {

        const {ctx} = this
        const {userInfo} = ctx.request.identityInfo
        const presentableIds = presentableInfos.map(x => x.presentableId).toString()
        const presentableAuthTrees = await ctx.curlIntranetApi(`${ctx.webApi.presentableInfo}/authTrees?presentableIds=${presentableIds}`)
            .then(list => new Map(list.map(x => [x.presentableId, x])))

        const authTasks = presentableInfos.map(presentableInfo =>
            this.presentableNodeAndReleaseSideAuth(presentableInfo, presentableAuthTrees.get(presentableInfo.presentableId), nodeInfo, userInfo)
                .then(authResult => presentableInfo.authResult = authResult))

        return Promise.all(authTasks).then(() => presentableInfos.map(presentableInfo => lodash.pick(presentableInfo, ['presentableId', 'authResult'])))
    }

    /**
     * presentable发行和节点侧授权
     * @param presentableInfo
     * @param nodeInfo
     * @returns {Promise<void>}
     */
    async presentableNodeAndReleaseSideAuth(presentableInfo, presentableAuthTree, nodeInfo, nodeUserInfo) {

        const {ctx} = this

        const releaseSideAuthTask = ctx.service.releaseContractAuthService.presentableReleaseSideAuth(presentableInfo, presentableAuthTree)
        const nodeSideAuthTask = ctx.service.nodeContractAuthService.presentableNodeSideAuth(presentableInfo, presentableAuthTree, nodeInfo, nodeUserInfo)

        const [nodeSideAuthResult, releaseSideAuthResult] = await Promise.all([nodeSideAuthTask, releaseSideAuthTask])

        return nodeSideAuthResult.isAuth ? releaseSideAuthResult : nodeSideAuthResult
    }
}