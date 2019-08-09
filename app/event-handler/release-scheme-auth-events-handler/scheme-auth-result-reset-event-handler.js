'use strict'

const lodash = require('lodash')
const contractStatusEnum = require('../../enum/contract-status-enum')
const {ReleaseSchemeAuthChangedEvent} = require('../../enum/rabbit-mq-publish-event')
const {GenerateSchemeAuthInfoEvent} = require('../../enum/outside-system-event')

/**
 * 计算方案的授权结果
 * @type {module.ReleaseSchemeAuthResultResetEventHandler}
 */
module.exports = class ReleaseSchemeAuthResultResetEventHandler {

    constructor(app) {
        this.app = app
        this.contractProvider = app.dal.contractProvider
        this.releaseAuthResultProvider = app.dal.releaseAuthResultProvider
        this.releaseSchemeAuthRelationProvider = app.dal.releaseSchemeAuthRelationProvider
    }

    /**
     * 重新计算方案的授权状态
     * @param schemeId
     * @param operation 1:只重置自身合约授权情况 2:只重置上游发行授权情况 3:前两种都重置
     */
    async handler({schemeId, operation}) {

        const releaseSchemeAuthResult = await this.releaseAuthResultProvider.findOne({schemeId})
        if (!releaseSchemeAuthResult) {
            return
        }

        let {status, selfContractAuthStatus, upstreamAuthStatus} = releaseSchemeAuthResult
        const resolveReleases = await this.releaseSchemeAuthRelationProvider.find({schemeId})

        const tasks = []
        if ((operation & 1) == 1) {
            tasks.push(this.getSchemeSelfAuthStatus(schemeId, resolveReleases).then(authStatus => selfContractAuthStatus = authStatus))
        }
        if ((operation & 2) == 2) {
            tasks.push(this.getUpstreamReleaseAuthStatus(schemeId, resolveReleases).then(authStatus => upstreamAuthStatus = authStatus))
        }

        const resetAuthStatus = await Promise.all(tasks).then(() => selfContractAuthStatus | upstreamAuthStatus)

        if (resetAuthStatus !== status) {
            await this.releaseSchemeAuthChangedHandle(releaseSchemeAuthResult, resetAuthStatus)
        }
    }

    /**
     * 方案的授权结果发生变化事件
     * @param schemeId
     * @param resetAuthStatus
     * @returns {Promise<void>}
     */
    async releaseSchemeAuthChangedHandle(releaseSchemeAuthResult, resetAuthStatus) {

        const {isAuth, schemeId} = releaseSchemeAuthResult
        const schemeIsAuth = resetAuthStatus === 5 ? 1 : 0

        await this.releaseAuthResultProvider.updateOne({schemeId}, {
            status: resetAuthStatus, isAuth: schemeIsAuth
        })

        if (isAuth === schemeIsAuth) {
            return
        }

        await this.app.rabbitClient.publish(Object.assign({}, ReleaseSchemeAuthChangedEvent, {
            body: {schemeId, status: resetAuthStatus}
        }))
    }

    /**
     * 获取方案自身的授权情况
     * @returns {Promise<int>}
     */
    async getSchemeSelfAuthStatus(schemeId, resolveReleases) {

        if (!resolveReleases.length) {
            return 1
        }

        const updateDate = new Date()
        const allContractIds = lodash.chain(resolveReleases).map(x => x.associatedContracts).flatten().filter(x => x.contractId).map(x => x.contractId).value()
        const contractMap = await this.contractProvider.find({_id: {$in: allContractIds}})
            .then(list => new Map(list.map(x => [x.contractId, x])))

        const changedResolveReleases = []
        resolveReleases.forEach(resolveRelease => {
            let isChanged = false
            resolveRelease.associatedContracts.forEach(contract => {
                let newContractStatus = this._convertContractStatus(contractMap.get(contract.contractId).status)
                if (contract.contractStatus !== newContractStatus) {
                    isChanged = true
                    contract.updateDate = updateDate
                    contract.contractStatus = newContractStatus
                }
            })
            if (!isChanged) {
                return
            }
            changedResolveReleases.push(resolveRelease)
            resolveRelease.contractIsAuth = resolveRelease.associatedContracts.length && resolveRelease.associatedContracts.some(x => (x.contractStatus & 8) === 8) ? 1 : 0
        })

        if (changedResolveReleases.length) {
            const bulkWrites = changedResolveReleases.map(({resolveReleaseId, associatedContracts, contractIsAuth}) => Object({
                updateOne: {
                    filter: {schemeId, resolveReleaseId},
                    update: {associatedContracts, contractIsAuth}
                }
            }))
            this.releaseSchemeAuthRelationProvider.model.bulkWrite(bulkWrites).catch(console.error)
        }

        const isExistUninitializedContract = resolveReleases.some(x => x.associatedContracts.some(m => m.contractStatus === -1))
        const isEveryContractGroupIsAuth = resolveReleases.filter(x => x.resolveReleaseVersionRanges.length).every(x => x.contractIsAuth)

        //签约,但是实际未使用的合约,在授权的过程中不予校验,默认获得授权
        return isExistUninitializedContract ? 0 : isEveryContractGroupIsAuth ? 1 : 2
    }


    /**
     * 计算上游发行的授权情况
     * @returns {Promise<int>}
     */
    async getUpstreamReleaseAuthStatus(schemeId, resolveReleases) {

        if (!resolveReleases.length) {
            return 4
        }

        const {app} = this
        const resolveReleaseIds = [], releaseResolveReleaseVersionRanges = []
        resolveReleases.forEach(({resolveReleaseId, resolveReleaseVersionRanges}) => {
            resolveReleaseVersionRanges.forEach(versionRange => {
                resolveReleaseIds.push(resolveReleaseId)
                releaseResolveReleaseVersionRanges.push(versionRange)
            })
        })

        const releaseVersions = await app.curlIntranetApi(`${app.webApi.releaseInfo}/maxSatisfyingVersion?releaseIds=${resolveReleaseIds.toString()}&versionRanges=${releaseResolveReleaseVersionRanges.toString()}`)
        const schemeAuthResults = await this.releaseAuthResultProvider.find({$or: releaseVersions})

        const differences = lodash.differenceWith(releaseVersions, schemeAuthResults, (x, y) => x.releaseId === y.releaseId && x.version === y.version)

        if (differences.length) {
            // setTimeout(() => this.app.rabbitClient.publish(Object.assign({}, ReleaseSchemeAuthResultResetEvent, {
            //     body: {schemeId, operation: 2} //重新计算发行的状态
            // })), 5000)
            console.log('上游发行不全,已发送重新计算任务')
            console.log(JSON.stringify(releaseVersions))
            console.log(JSON.stringify(schemeAuthResults))

            differences.forEach(({releaseId, version}) => app.emit(GenerateSchemeAuthInfoEvent, {releaseId, version}))
            
            return 0
        }

        return releaseVersions.some(x => x.version === null) || !schemeAuthResults.length || schemeAuthResults.some(x => !x.isAuth) ? 8 : 4
    }

    /**
     * 把合约的状态转换成关系链中规定的状态值
     * @param contractStatus
     * @returns {number}
     * @private
     */
    _convertContractStatus(contractStatus) {
        return contractStatus === contractStatusEnum.uninitialized ? -1 : contractStatus === contractStatusEnum.active ? 8 : 2
    }
}