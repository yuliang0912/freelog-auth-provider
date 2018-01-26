'use strict'

const Service = require('egg').Service
const authCodeEnum = require('../enum/auth_code')
const authErrCodeEnum = require('../enum/auth_err_code')
const authService = require('../authorization-service/process-manager')
const commonAuthResult = require('../authorization-service/common-auth-result')

/**
 * presentable授权业务逻辑层
 */
class PresentableAuthService extends Service {

    /**
     * 授权流程处理者
     * @returns {Promise<void>}
     */
    async authProcessHandler({userId, nodeId, presentableId, userContractId}) {

        // let lastAuthResult = userId ? this.getAuthToken({userId, presentableId}) : null
        // if (lastAuthResult) {
        //     return lastAuthResult
        // }

        //此处也可以考虑去调用API获取用户信息
        let userInfo = userId ? this.ctx.request.identityInfo.userInfo : null
        let nodeInfo = await this.ctx.curlIntranetApi(`${this.config.gatewayUrl}/api/v1/nodes/${nodeId}`)
        if (!nodeInfo || nodeInfo.status !== 0) {
            this.ctx.error({msg: '参数nodeId错误', data: nodeInfo})
        }
        let presentableInfo = await this.ctx.curlIntranetApi(`${this.config.gatewayUrl}/api/v1/presentables/${presentableId}`)
        if (!presentableInfo || presentableInfo.nodeId !== nodeId) {
            this.ctx.error({msg: '参数presentableId错误', data: presentableInfo})
        }

        let userContract = await this.getUserContract({userId, nodeId, presentableId, userContractId})

        //进行第一次授权尝试
        let authResult = await authService.presentableAuthorization({presentableInfo, userInfo, nodeInfo, userContract})

        /**
         * A.如果返回错误码不是notFoundUserContract则代表有用户,并且有合同
         * B.如果是未登录用户,则默认检查的presentable策略是否符合public-initial-terminate
         * 以上两种结果直接返回授权服务的授权结果,否则去校验用户能否静默创建合同,继续后面代码逻辑检查
         */
        if (authResult.isAuth || authResult.authErrCode !== authErrCodeEnum.notFoundUserContract) {
            return authResult
        }

        /**
         * A.此时存在登录用户
         * B.去模拟调用是否能通过initial-terminate的方式授权
         * C.如果能授权,则默认创建一个合同,再次授权,如果不能授权,则返回之前的授权结果(用户未签约合同)
         */
        let virtualContractAuthResult = authService.virtualContractAuthorization({presentableInfo, userInfo})
        if (!virtualContractAuthResult.isAuth) {
            return authResult
        }

        //如果通过initial-terminate模式授权,则静默的为用户创建一个合同,因为系统的健全都是基于合同来执行的
        userContract = await this.createUserContract({
            presentableInfo, userInfo, nodeInfo,
            policySegment: virtualContractAuthResult.data.policySegment
        })

        //针对新创建的合同进行二次授权重试
        return authService.presentableAuthorization({presentableInfo, userInfo, nodeInfo, userContract})
    }

    /**
     * 获取用户合同函数
     * A.如果没有用户信息,则返回null
     * B.如果有登陆用户,且指定了需要执行的合同,则返回用户指定要执行的合同
     * C.如果有登陆用户,但是没用指定需要执行的合同,则搜索所有的合同,如果没有合同,则返回null,
     * 如果只有一份合同,则返回此份合同
     * 如果有多份激活态合同或者多份全部未激活的合同,则让用户选择执行,前端去引导激活合同或者选择需要执行的合同
     * 如果有多份合同,但是只有一份激活态合同,则返回激活态合同执行
     */
    async getUserContract({userId, presentableId, nodeId, userContractId}) {

        if (!userId) {
            return null
        }

        if (userContractId) {
            let userContract = await this.app.dataProvider.contractProvider.getContract({
                _id: userContractId,
                targetId: presentableId,
                partyOne: nodeId,
                contractType: this.app.contractType.PresentableToUer,
                partyTwo: userId
            })
            if (!userContract) {
                this.ctx.error({msg: '参数userContractId错误,未能找到与当前用户匹配的合同'})
            }
            return userContract
        }

        //如果用户没有选择具体需要执行的合同,则搜索用户的合同列表
        let allUserContracts = await this.app.dataProvider.contractProvider.getContracts({
            targetId: presentableId,
            partyOne: nodeId,
            partyTwo: userId,
            contractType: this.app.contractType.PresentableToUer,
            status: {$in: [1, 2, 3]}
        })

        //如果用户没有签订合同,则返回
        if (!allUserContracts.length) {
            return null
        }

        //如果用户只有一个合同,则直接返回当前合同
        if (allUserContracts.length === 1) {
            return allUserContracts[0].toObject()
        }

        //如果用户有多个合同.默认找激活态的合同
        let activatedContracts = allUserContracts.filter(t => t.status === 3)
        if (activatedContracts.length === 1) {
            return activatedContracts[0].toObject()
        }

        let result = new commonAuthResult(authCodeEnum.NodeContractUngratified)
        result.authErrCode = authErrCodeEnum.chooseUserContract
        result.data.contracts = allUserContracts

        this.ctx.error({msg: "请选择一个合同执行", data: result.toObject()})
    }

    /**
     * 创建用户合同
     * @param userContract
     * @returns {Promise<void>}
     */
    async createUserContract({presentableInfo, policySegment, userInfo, nodeInfo}) {
        let postData = {
            contractType: this.app.contractType.PresentableToUer,
            segmentId: policySegment.segmentId,
            targetId: presentableInfo.presentableId,
            serialNumber: presentableInfo.serialNumber,
            partyTwo: userInfo.userId
        }

        return this.ctx.curlIntranetApi(`${this.config.gatewayUrl}/api/v1/contracts`, {
            type: 'post',
            data: postData
        }).catch(error => {
            this.ctx.error({msg: '创建用户合同失败', data: error.toString()})
        })
    }

    /**
     * 获取上次授权结果
     * @param userId
     * @param presentableId
     * @returns {Promise<*>}
     */
    async getAuthToken({userId, presentableId}) {
        return await this.app.dataProvider.presentableTokenProvider.getLatestResourceToken(presentableId, userId)
    }
}

module.exports = PresentableAuthService