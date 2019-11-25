'use strict'

module.exports = app => {

    const {router, controller} = app
    const {contract, contractEvent, auth} = controller
    const {presentableV1, releaseV1, testNodeV1} = auth

    //合同相关
    router.get('contract-list', '/v1/contracts/list', contract.v1.list)
    router.get('test-is-can-exec-event', '/v1/contracts/isCanExecEvent', contract.v1.isCanExecEvent)
    router.get('terminated-contracts', '/v1/contracts/terminatedContracts', contract.v1.terminatedContracts)

    router.post('development-test-api', '/v1/contracts/test', contract.v1.testContractFsm)
    router.post('contract-event-payment', '/v1/contracts/events/payment', contractEvent.v1.payment)
    router.post('contract-event-escrowRefunded', '/v1/contracts/events/escrowRefunded', contractEvent.v1.escrowRefunded)
    router.post('contract-event-signingLicenses', '/v1/contracts/events/signingLicenses', contractEvent.v1.signingLicenses)
    router.post('contract-event-escrowConfiscated', '/v1/contracts/events/escrowConfiscated', contractEvent.v1.escrowConfiscated)
    router.post('batch-sign-release-contracts', '/v1/contracts/batchCreateReleaseContracts', contract.v1.batchCreateReleaseContracts)
    router.post('contract-event-customEventInvoking', '/v1/contracts/events/customEventInvoking', contractEvent.v1.customEventInvoking)

    //授权相关
    router.get('release-policy-identity-authorization', '/v1/auths/releases/batchPolicyIdentityAuthentication', presentableV1.batchReleasePolicyIdentityAuthentication)
    router.get('presentable-policy-identity-authorization', '/v1/auths/presentables/batchPolicyIdentityAuthentication', presentableV1.batchPresentablePolicyIdentityAuthentication)
    router.get('presentable-node-and-release-side-auth', '/v1/auths/presentables/:presentableId/nodeAndReleaseSideAuth', presentableV1.presentableNodeAndReleaseSideAuth)
    router.get('presentable-batch-node-and-release-side-auth', '/v1/auths/presentables/batchNodeAndReleaseSideAuth', presentableV1.batchPresentableNodeAndReleaseSideAuth)
    router.get('presentable-node-and-release-side-auth-sketch', '/v1/auths/presentables/:presentableId/nodeAndReleaseSideAuthSketch', presentableV1.presentableNodeAndReleaseSideAuthSketch)

    //发行授权
    router.get('release-auth', '/v1/auths/releases/:releaseId.:extName', releaseV1.releaseAuth)
    router.get('release-auth', '/v1/auths/releases/:releaseId', releaseV1.releaseAuth)

    //presentable授权(通过ID/通过发行名/子资源),以下路由不能随意调换顺序
    router.get('presentable-auth-ext', '/v1/auths/:nodeId/presentables/detail.:extName', presentableV1.presentableAuth)
    router.get('presentable-auth-ext', '/v1/auths/:nodeId/presentables/detail', presentableV1.presentableAuth)
    router.get('presentable-sub-release-auth-ext', '/v1/auths/presentables/:presentableId/subDepend.:extName', presentableV1.presentableSubReleaseAuth)
    router.get('presentable-sub-release-auth', '/v1/auths/presentables/:presentableId/subDepend', presentableV1.presentableSubReleaseAuth)
    router.get('presentable-auth-ext', '/v1/auths/presentables/:presentableId.:extName', presentableV1.presentableAuth)
    router.get('presentable-auth', '/v1/auths/presentables/:presentableId', presentableV1.presentableAuth)

    //测试资源授权(通过ID/通过发行名/子资源),以下路由不能随意调换顺序
    router.get('node-test-resource-auth', '/v1/auths/:nodeId/testResources/detail.:extName', testNodeV1.testResourceAuth)
    router.get('node-test-resource-auth', '/v1/auths/:nodeId/testResources/detail', testNodeV1.testResourceAuth)
    router.get('node-test-resource-auth', '/v1/auths/testResources/:testResourceId/subDepend.:extName', testNodeV1.testResourceSubDependAuth)
    router.get('node-test-resource-auth', '/v1/auths/testResources/:testResourceId/subDepend', testNodeV1.testResourceSubDependAuth)
    router.get('node-test-resource-auth', '/v1/auths/testResources/:testResourceId.:extName', testNodeV1.testResourceAuth)
    router.get('node-test-resource-auth', '/v1/auths/testResources/:testResourceId', testNodeV1.testResourceAuth)

    router.resources('contract-info', '/v1/contracts', contract.v1)
};
