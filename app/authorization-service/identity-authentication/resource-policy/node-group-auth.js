/**
 * 节点分组策略认证检查
 */
'use strict'

const AuthResult = require('../../common-auth-result')
const authCodeEnum = require('../../../enum/auth_code')
const authErrorCodeEnum = require('../../../enum/auth_err_code')
const commonRegex = require('egg-freelog-base/app/extend/helper/common_regex')
const globalInfo = require('egg-freelog-base/globalInfo')

module.exports.auth = async ({policyAuthUsers, userInfo, nodeInfo}) => {

    let authResult = new AuthResult(authCodeEnum.Default)
    let groupUserPolicy = policyAuthUsers.find(t => t.userType.toUpperCase() === 'GROUP')

    //如果没有分组认证的策略,则默认返回
    if (!groupUserPolicy) {
        return authResult
    }

    //如果存在所有访问者分组,则通过
    if (groupUserPolicy.users.some(item => item.toUpperCase() === 'PUBLIC')) {
        authResult.authCode = authCodeEnum.BasedOnGroup
        return authResult
    }

    //如果分组策略中允许所有节点签约,并且存在节点信息
    if (nodeInfo && groupUserPolicy.users.some(item => item.toUpperCase() === 'NODES')) {
        authResult.authCode = authCodeEnum.BasedOnGroup
        return authResult
    }

    /**
     * TODO  A.检查节点是否在用户的自定义节点组中
     * TODO  B.检查节点所属人是否在用户的自定义用户分组中.
     * TODO  满足A或者B任意条件则通过认证
     * @type {T[]}
     */
    let app = globalInfo.app
    let isExistMember = async (groups, memberId) => {
        let existGroups = await app.curl(`${app.config.gatewayUrl}/api/v1/groups/isExistMember?memberId=${memberId}&groupIds=${groups.toString()}`, {dataType: 'json'}).then(res => {
            return res.data.data
        })
        return Array.isArray(existGroups) && existGroups.length
    }

    let customNodeGroups = groupUserPolicy.users.filter(item => commonRegex.nodeGroupId.test(item))
    if (nodeInfo && customNodeGroups.length && (await isExistMember(customNodeGroups, nodeInfo.nodeId))) {
        authResult.authCode = authCodeEnum.BasedOnGroup
        return authResult
    }

    let customUserGroups = groupUserPolicy.users.filter(item => commonRegex.userGroupId.test(item))
    //如果存在节点,则校验节点的主人ID是否在用户的自定义分组中
    if (nodeInfo && customUserGroups.length && (await isExistMember(customUserGroups, nodeInfo.ownerUserId))) {
        authResult.authCode = authCodeEnum.BasedOnGroup
        return authResult
    }
    //如果不存在节点信息,但是存在用户信息,则校验用户ID是否在用户自定义分组中
    if (!nodeInfo && userInfo && customUserGroups.length && (await isExistMember(customUserGroups, userInfo.userId))) {
        authResult.authCode = authCodeEnum.BasedOnGroup
        return authResult
    }

    //其他分组默认不通过
    authResult.authCode = authCodeEnum.UserObjectUngratified
    authResult.authErrCode = authErrorCodeEnum.identityAuthenticationRefuse
    authResult.data.groupUserPolicy = groupUserPolicy
    return authResult
}


