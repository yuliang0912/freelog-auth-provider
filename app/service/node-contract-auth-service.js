'use strict'

const lodash = require('lodash')
const Service = require('egg').Service
const authCodeEnum = require('../enum/auth-code')
const authService = require('../authorization-service/process-manager')
const commonAuthResult = require('../authorization-service/common-auth-result')

module.exports = class NodeContractAuthService extends Service {

    constructor({app}) {
        super(...arguments)
        this.contractProvider = app.dal.contractProvider
    }

    /**
     * presentable节点侧授权
     * @param presentableInfo
     * @param presentableAuthTree
     * @param nodeInfo
     * @param nodeUserInfo
     * @returns {Promise<module.CommonAuthResult|*>}
     */
    async presentableNodeSideAuth(presentableInfo, presentableAuthTree, nodeInfo, nodeUserInfo) {

        const {ctx} = this
        const {presentableId, nodeId} = presentableInfo

        const authToken = await ctx.service.authTokenService.getAuthToken({
            targetId: presentableId, targetVersion: presentableAuthTree.version, identityType: 2, partyTwo: nodeId
        })
        if (authToken) {
            return new commonAuthResult(authToken.authCode, {authToken})
        }

        const nodeResolveReleasesAuthResult = new commonAuthResult(authCodeEnum.BasedOnNodeContract)
        const practicalUsedReleases = this._getPresentablePracticalUsedReleases(presentableInfo, presentableAuthTree)
        const allNodeContractIds = lodash.chain(practicalUsedReleases).map(({contracts}) => contracts).flattenDeep().map(x => x.contractId).filter(x => x.contractId).value()

        if (!allNodeContractIds.length) {
            return nodeResolveReleasesAuthResult
        }

        const contractMap = await this.contractProvider.find({_id: {$in: allNodeContractIds}}).then(list => new Map(list.map(x => [x.contractId, x])))

        await this._nodeResolveReleaseContractAuth(nodeInfo, nodeUserInfo, Array.from(contractMap.values()))

        const authFailedNodeReleases = lodash.chain(practicalUsedReleases).filter(({contracts}) => !contracts.some(m => contractMap.get(m.contractId).isAuth)).value()
        if (authFailedNodeReleases.length) {
            nodeResolveReleasesAuthResult.data = authFailedNodeReleases
            nodeResolveReleasesAuthResult.authCode = authCodeEnum.NodeContractNotActive
        } else {
            this._saveNodeContractAuthResult(presentableInfo, presentableAuthTree, nodeResolveReleasesAuthResult)
        }

        return nodeResolveReleasesAuthResult
    }

    /**
     * presentable节点侧授权概况信息(此处不使用缓存信息)
     * @param presentableInfo
     * @param presentableAuthTree
     * @param nodeInfo
     * @param nodeUserInfo
     * @returns {Promise<void>}
     */
    async nodeResolveReleaseContractSketch(presentableInfo, presentableAuthTree, nodeInfo, nodeUserInfo) {

        const practicalUsedReleases = this._getPresentablePracticalUsedReleases(presentableInfo, presentableAuthTree)

        const allNodeContractIds = lodash.chain(practicalUsedReleases).map(({contracts}) => contracts).flattenDeep().map(x => x.contractId).value()
        const contractMap = await this.contractProvider.find({_id: {$in: allNodeContractIds}}).then(list => new Map(list.map(x => [x.contractId, x])))

        await this._nodeResolveReleaseContractAuth(nodeInfo, nodeUserInfo, Array.from(contractMap.values()))

        practicalUsedReleases.forEach(({contracts}) => contracts.forEach(contract => {
            contract.isAuth = contractMap.get(contract.contractId).isAuth
        }))

        return practicalUsedReleases
    }

    /**
     * 批量针对合同进行授权
     * @param nodeInfo
     * @param nodeUserInfo
     * @param contracts
     * @returns {Promise<any>}
     * @private
     */
    async _nodeResolveReleaseContractAuth(nodeInfo, nodeUserInfo, contracts) {

        const {ctx} = this
        const nodeContractAuthTasks = contracts.map(contract => {
            let params = {contract, partyTwoInfo: nodeInfo, partyTwoUserInfo: nodeUserInfo}
            return authService.contractAuthorization(ctx, params).then(authResult => contract.isAuth = authResult.isAuth)
        })

        return Promise.all(nodeContractAuthTasks).then(() => contracts)
    }

    /**
     * 获取presentable实际使用的发行
     * @param presentableInfo
     * @param presentableAuthTree
     * @returns {*}
     * @private
     */
    _getPresentablePracticalUsedReleases(presentableInfo, presentableAuthTree) {

        const {authTree} = presentableAuthTree
        const masterReleaseDependReleaseSet = new Set(authTree.filter(x => x.deep === 1).map(x => x.releaseId))

        return presentableInfo.resolveReleases.filter(x => masterReleaseDependReleaseSet.has(x.releaseId))
    }

    /**
     * 保存节点合同授权结果
     * @param presentableInfo
     * @param presentableAuthTree
     * @param authResult
     * @private
     */
    _saveNodeContractAuthResult(presentableInfo, presentableAuthTree, authResult) {

        if (!authResult.isAuth) {
            return
        }

        return this.ctx.service.authTokenService.saveNodePresentableAuthResult({
            presentableInfo, presentableAuthTree, authResult
        }).catch(error => {
            console.error('saveNodePresentableAuthResult-error', error)
        })
    }
}