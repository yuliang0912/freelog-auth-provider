/**
 * 节点分组策略认证检查
 */
'use strict'

const AuthResult = require('../../common-auth-result')
const authCodeEnum = require('../../../enum/auth_code')
const authErrorCodeEnum = require('../../../enum/auth_err_code')

module.exports.auth = ({policyAuthUsers, nodeInfo}) => {

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

    if (!nodeInfo) {
        authResult.authCode = authCodeEnum.UserObjectUngratified
        authResult.authErrCode = authErrorCodeEnum.notFoundNode
        authResult.addError('未找到节点信息')
        return authResult
    }

    //如果分组策略中允许所有节点签约
    if (groupUserPolicy.users.some(item => item.toUpperCase() === 'NODES')) {
        authResult.authCode = authCodeEnum.BasedOnGroup
        return authResult
    }

    /**
     * TODO  A.检查节点是否在用户的自定义节点组中
     * TODO  B.检查节点所属人是否在用户的自定义用户分组中.
     * TODO  满足A或者B任意条件则通过认证
     * @type {T[]}
     */
    let customNodeGroups = groupUserPolicy.users.filter(item => /^group_node_[a-zA-Z0-9-]{4,20}$/.test(item))
    let customUserGroups = groupUserPolicy.users.filter(item => /^group_user_[a-zA-Z0-9-]{4,20}$/.test(item))

    //其他分组默认不通过
    authResult.authCode = authCodeEnum.UserObjectUngratified
    authResult.authErrCode = authErrorCodeEnum.identityAuthenticationRefuse
    authResult.data.groupUserPolicy = groupUserPolicy
    return authResult
}

