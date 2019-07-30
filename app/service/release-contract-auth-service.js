'use strict'

const lodash = require('lodash')
const Service = require('egg').Service
const authCodeEnum = require('../enum/auth-code')
const {ArgumentError} = require('egg-freelog-base/error')
const authService = require('../authorization-service/process-manager')
const commonAuthResult = require('../authorization-service/common-auth-result')

module.exports = class ReleaseContractAuthService extends Service {

    constructor({app}) {
        super(...arguments)
        this.contractProvider = app.dal.contractProvider
    }

    /**
     * presentable发行侧授权
     * @param presentableInfo
     * @param presentableAuthTree
     * @returns {Promise<void>}
     */
    async presentableReleaseSideAuth(presentableInfo, presentableAuthTree) {

        const {ctx} = this
        const {authTree} = presentableAuthTree
        const releaseSchemeIds = lodash.chain(authTree).map(({releaseSchemeId}) => releaseSchemeId).uniq().value()
        const allReleaseSchemes = await ctx.curlIntranetApi(`${ctx.webApi.releaseInfo}/versions/list?projection=releaseId,version,resolveReleases&schemeIds=${releaseSchemeIds.toString()}`)

        //过滤掉已经获得授权的方案(没有依赖的OR缓存中通过授权的)
        const releaseSchemes = await this._filterAuthorisedSchemes(allReleaseSchemes)
        if (!releaseSchemes.length) {
            return new commonAuthResult(authCodeEnum.BasedOnReleaseContract)
        }

        this._getSchemePracticalUsedReleases(releaseSchemes, presentableAuthTree)

        //如果没有合同需要做授权,则代表是单一资源,没有依赖的发行需要做授权,天生通过
        const allSchemeContractIds = lodash.chain(releaseSchemes).map(x => x.resolveReleases).flattenDeep().map(({contracts}) => contracts).flattenDeep().map(x => x.contractId).uniq().value()

        const contracts = await this.contractProvider.find({_id: {$in: allSchemeContractIds}})
        const userIds = lodash.chain(contracts).map(x => x.partyTwoUserId).uniq().value()
        const partyTwoUserInfoMap = await ctx.curlIntranetApi(`${ctx.webApi.userInfo}?userIds=${userIds.toString()}`)
            .then(list => new Map(list.map(x => [x.userId, x])))
        const contractMap = new Map(contracts.map(x => [x.contractId, x]))

        const releaseSchemesAuthResult = await this._releaseSchemesAuth(releaseSchemes, contractMap, partyTwoUserInfoMap)

        //针对授权通过的发行方案进行结果缓存
        const authorisedReleaseSchemes = lodash.differenceBy(releaseSchemes, releaseSchemesAuthResult.data.authFailedReleaseSchemes || [], x => x.releaseId)
        this._batchSaveReleaseSchemeAuthResults(authorisedReleaseSchemes)

        return releaseSchemesAuthResult
    }

    /**
     * 发行方案授权(仅包含方案内部的合约)
     * @param releaseSchemeInfo
     * @returns {Promise<void>}
     */
    async releaseSchemeInteriorContractsAuth(releaseSchemeInfo, userInfo) {

        const {ctx} = this
        const {resolveReleases} = releaseSchemeInfo
        if (!resolveReleases.length) {
            return resolveReleases
        }

        const allSchemeContractIds = lodash.chain(resolveReleases).map(({contracts}) => contracts).flattenDeep().map(x => x.contractId).uniq().value()

        const contracts = await this.contractProvider.find({_id: {$in: allSchemeContractIds}})
        const userIds = lodash.chain(contracts).map(x => x.partyTwoUserId).uniq().value()
        const partyTwoUserInfoMap = await ctx.curlIntranetApi(`${ctx.webApi.userInfo}?userIds=${userIds.toString()}`)
            .then(list => new Map(list.map(x => [x.userId, x])))
        const contractMap = new Map(contracts.map(x => [x.contractId, x]))

        await this._releaseSchemeContractAuth(userInfo, contracts, partyTwoUserInfoMap)

        return resolveReleases.map(({releaseId, releaseName, contracts}) => Object({
            releaseId, releaseName,
            isAuth: contracts.some(x => contractMap.get(x.contractId).isAuth)
        }))
    }

    /**
     * 发行的方案内部合同授权
     * @param userInfo
     * @param contracts
     * @param partyTwoUserInfoMap
     * @returns {Promise<any>}
     * @private
     */
    async _releaseSchemeContractAuth(userInfo, contracts, partyTwoUserInfoMap) {

        const {ctx} = this
        const releaseContractAuthTasks = contracts.map(contract => {
            let partyTwoUserInfo = partyTwoUserInfoMap.get(contract.partyTwoUserId)
            return authService.contractAuthorization(ctx, {
                contract, partyTwoUserInfo
            }).then(authResult => contract.isAuth = authResult.isAuth)
        })

        return Promise.all(releaseContractAuthTasks).then(() => contracts)
    }

    /**
     * 批量针对发行的方案进行授权
     * @param releaseSchemes 调用方自动去除实际未依赖的发行
     * @param contractMap
     * @param userInfoMap
     * @returns {Promise<module.CommonAuthResult|*>}
     */
    async _releaseSchemesAuth(releaseSchemes, contractMap, userInfoMap) {

        let {ctx} = this, index = 0
        const authorizedReleaseSet = new Set() //授权通过的方案-发行
        const returnAuthResult = new commonAuthResult(authCodeEnum.BasedOnReleaseContract)

        while (true) {
            let batchContracts = []
            for (let x = 0, y = releaseSchemes.length; x < y; x++) {
                let {schemeId, resolveReleases} = releaseSchemes[x]
                for (let m = 0, n = resolveReleases.length; m < n; m++) {
                    let {releaseId, contracts} = resolveReleases[m]
                    if (contracts.length - 1 >= index && !authorizedReleaseSet.has(schemeId + releaseId)) {
                        batchContracts.push(contractMap.get(contracts[index].contractId))
                    }
                }
            }
            if (!batchContracts.length) {
                break
            }
            if (batchContracts.some(x => x === undefined)) {
                throw new ArgumentError(ctx.gettext('params-validate-failed', 'contractMap'))
            }
            const nodeContractAuthTasks = batchContracts.map(contract => {
                let partyTwoUserInfo = userInfoMap.get(contract.partyTwoUserId)
                return !Reflect.has(contract, 'isAuth') ? authService.contractAuthorization(ctx, {
                    contract, partyTwoUserInfo
                }).then(authResult => contract.isAuth = authResult.isAuth) : undefined
            })

            await Promise.all(nodeContractAuthTasks)

            for (let x = 0, y = releaseSchemes.length; x < y; x++) {
                let {schemeId, resolveReleases} = releaseSchemes[x]
                for (let m = 0, n = resolveReleases.length; m < n; m++) {
                    let {releaseId, contracts} = resolveReleases[m]
                    if (!authorizedReleaseSet.has(schemeId + releaseId) && contracts.some(m => contractMap.get(m.contractId).isAuth)) {
                        authorizedReleaseSet.add(schemeId + releaseId)
                    }
                }
            }
            index++
        }

        const authFailedReleaseSchemes = releaseSchemes.filter(({schemeId, resolveReleases}) => resolveReleases.some(m => !authorizedReleaseSet.has(schemeId + m.releaseId)))
        if (authFailedReleaseSchemes.length) {
            returnAuthResult.authCode = authCodeEnum.ReleaseContractNotActive
            returnAuthResult.data.authFailedReleaseSchemes = authFailedReleaseSchemes
        }

        return returnAuthResult
    }

    /**
     * 获取presentable对应的发行的方案中实际使用的发行
     * @param releaseSchemes
     * @param presentableAuthTree
     * @returns {*}
     * @private
     */
    _getSchemePracticalUsedReleases(releaseSchemes, presentableAuthTree) {

        const {authTree} = presentableAuthTree

        releaseSchemes.forEach(releaseScheme => {
            let {schemeId, resolveReleases} = releaseScheme
            let dependencies = authTree.filter(({parentReleaseSchemeId}) => parentReleaseSchemeId === schemeId)
            releaseScheme.resolveReleases = lodash.intersectionBy(resolveReleases, dependencies, x => x.releaseId)
        })

        return releaseSchemes
    }

    /**
     * 批量保存授权通过的发行方案
     * @param authorisedReleaseSchemes
     * @param authResult
     */
    _batchSaveReleaseSchemeAuthResults(authorisedReleaseSchemes) {

        const {ctx} = this
        const authResult = new commonAuthResult(authCodeEnum.BasedOnReleaseContract)
        const tasks = authorisedReleaseSchemes.map(item => ctx.service.authTokenService.saveReleaseSchemeAuthResult(item, authResult))

        return Promise.all(tasks)
    }

    /**
     * 过滤掉已经缓存通过授权的方案
     * @param releaseSchemes
     * @private
     */
    async _filterAuthorisedSchemes(releaseSchemes, isFilterEmptyResolveReleases = true, isFilterCacheToken = true) {

        let lodashChain = lodash.chain(releaseSchemes)
        if (isFilterEmptyResolveReleases) {
            lodashChain = lodashChain.filter(x => x.resolveReleases.length)
        }
        if (isFilterCacheToken && releaseSchemes.length) {
            const authTokens = await this.ctx.service.authTokenService.getAuthTokens({
                $or: releaseSchemes.map(({schemeId, releaseId}) => Object({
                    targetId: schemeId, partyTwo: releaseId, identityType: 1
                }))
            })
            lodashChain = lodashChain.differenceWith(authTokens, (schemeInfo, tokenInfo) => {
                let {schemeId, releaseId} = schemeInfo
                return schemeId === tokenInfo.targetId && releaseId === tokenInfo.partyTwo
            })
        }
        return lodashChain.value()
    }
}