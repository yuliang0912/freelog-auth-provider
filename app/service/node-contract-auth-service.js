'use strict'

const lodash = require('lodash')
const Service = require('egg').Service
const authCodeEnum = require('../enum/auth-code')
const AuthService = require('../authorization-service/process-manager')
const commonAuthResult = require('../authorization-service/common-auth-result')

module.exports = class NodeContractAuthService extends Service {

    constructor({app}) {
        super(...arguments)
        this.authService = new AuthService(app)
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
        const allNodeContractIds = lodash.chain(practicalUsedReleases).map(({contracts}) => contracts).flattenDeep().filter(x => x.contractId).map(x => x.contractId).value()
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
     * 测试资源节点侧授权
     * @param testResourceInfo
     * @param testResourceAuthTree
     * @param nodeInfo
     * @param nodeUserInfo
     * @returns {Promise<void>}
     */
    async testResourceNodeSideAuth(testResourceInfo, testResourceAuthTree, nodeInfo, nodeUserInfo) {

        const {authTree} = testResourceAuthTree
        const nodeResolveReleasesAuthResult = new commonAuthResult(authCodeEnum.BasedOnNodeContract)
        //测试授权中,如果是自己的mock或者发行,则自动获得授权.不需要额外走一次合约授权
        const masterReleaseDependReleaseSet = new Set(authTree.filter(x => x.deep === 1 && x.type === 'release' && x.userId !== nodeUserInfo.userId).map(x => x.id))
        //实际使用过程中用到的发行,如果上抛了,但是没有使用,则忽略其授权状态
        const practicalUsedReleases = testResourceInfo.resolveReleases.filter(x => masterReleaseDependReleaseSet.has(x.releaseId))
        const allNodeContractIds = lodash.chain(practicalUsedReleases).map(({contracts}) => contracts).flattenDeep().filter(x => x.contractId).map(x => x.contractId).value()

        if (!allNodeContractIds.length) {
            return nodeResolveReleasesAuthResult
        }

        const contractMap = await this.contractProvider.find({_id: {$in: allNodeContractIds}}).then(list => new Map(list.map(x => [x.contractId, x])))

        await this._nodeResolveReleaseContractTestAuth(nodeInfo, nodeUserInfo, Array.from(contractMap.values()))

        const authFailedNodeReleases = lodash.chain(practicalUsedReleases).filter(({contracts}) => !contracts.some(m => contractMap.get(m.contractId).isAuth)).value()
        if (authFailedNodeReleases.length) {
            nodeResolveReleasesAuthResult.data = authFailedNodeReleases
            nodeResolveReleasesAuthResult.authCode = authCodeEnum.NodeContractNotActive
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

        const allNodeContractIds = lodash.chain(practicalUsedReleases).map(({contracts}) => contracts).flattenDeep().filter(x => x.contractId).map(x => x.contractId).value()

        const contractMap = !allNodeContractIds.length ? new Map() :
            await this.contractProvider.find({_id: {$in: allNodeContractIds}}).then(list => new Map(list.map(x => [x.contractId, x])))

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

        const {ctx, authService} = this
        const nodeContractAuthTasks = contracts.map(contract => {
            let params = {contract, partyTwoInfo: nodeInfo, partyTwoUserInfo: nodeUserInfo}
            return authService.contractAuthorization(params).then(authResult => contract.isAuth = authResult.isAuth)
        })

        return Promise.all(nodeContractAuthTasks).then(() => contracts)
    }

    /**
     * 节点解决的发行测试授权
     * @param nodeInfo
     * @param nodeUserInfo
     * @param contracts
     * @returns {Promise<any>}
     * @private
     */
    async _nodeResolveReleaseContractTestAuth(nodeInfo, nodeUserInfo, contracts) {

        const {ctx, authService} = this
        const nodeContractAuthTasks = contracts.map(contract => {
            let params = {contract, partyTwoInfo: nodeInfo, partyTwoUserInfo: nodeUserInfo}
            return authService.contractTestAuthorization(params).then(authResult => {
                contract.isAuth = authResult.isAuth || authResult.isTestAuth
            })
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