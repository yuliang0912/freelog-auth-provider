'use strict'

const lodash = require('lodash')
const Service = require('egg').Service
const authCodeEnum = require('../enum/auth-code')
const {ArgumentError} = require('egg-freelog-base/error')
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

        const {authTree} = presentableAuthTree
        const {resolveReleases} = presentableInfo
        const masterReleaseDependReleaseSet = new Set(authTree.filter(x => x.deep === 1).map(x => x.releaseId))
        const practicalResolveReleases = resolveReleases.filter(x => masterReleaseDependReleaseSet.has(x.releaseId))

        const allNodeContractIds = lodash.chain(practicalResolveReleases).map(x => x.contracts).flattenDeep().map(x => x.contractId).value()
        const contractMap = await this.contractProvider.find({_id: {$in: allNodeContractIds}}).then(list => new Map(list.map(x => [x.contractId, x])))

        return this.nodeResolveReleasesAuth(nodeInfo, practicalResolveReleases, contractMap, nodeUserInfo)
    }

    /**
     * 对节点解决的发行进行授权
     * @param nodeInfo
     * @param resolveReleases 此参数需要调用方自动决定是否过滤掉未实际使用的发行
     * @param contractMap
     * @param nodeUserInfo
     * @returns {Promise<module.CommonAuthResult|*>}
     */
    async nodeResolveReleasesAuth(nodeInfo, resolveReleases, contractMap, nodeUserInfo) {

        const {ctx} = this
        const allNodeContracts = lodash.chain(resolveReleases).map(x => x.contracts).flattenDeep().map(x => contractMap.get(x.contractId)).value()
        if (allNodeContracts.some(x => x === undefined)) {
            throw new ArgumentError(ctx.gettext('params-validate-failed', 'contractMap'))
        }

        const returnAuthResult = new commonAuthResult(authCodeEnum.BasedOnNodeContract)
        const nodeContractAuthTasks = allNodeContracts.map(contract => {
            return !Reflect.has(contract, 'isAuth') ? authService.contractAuthorization(ctx, {
                contract, partyTwoInfo: nodeInfo, partyTwoUserInfo: nodeUserInfo
            }).then(authResult => contract.isAuth = authResult.isAuth) : undefined
        })

        await Promise.all(nodeContractAuthTasks)

        const authFailedNodeReleases = lodash.chain(resolveReleases).filter(x => !x.contracts.some(m => contractMap.get(m.contractId).isAuth)).value()
        if (authFailedNodeReleases.length) {
            returnAuthResult.data = authFailedNodeReleases
            returnAuthResult.authCode = authCodeEnum.NodeContractNotActive
        }

        return returnAuthResult
    }
}