'use strict';

module.exports = app => {

    const {router, controller} = app
    const {contract, contractEvent, auth} = controller

    //合同相关
    router.get('contract-list', '/v1/contracts/list', contract.v1.list)
    router.get('terminated-contracts', '/v1/contracts/terminateContracts', contract.v1.terminatedContracts)
    router.post('batch-sign-release-contracts', '/v1/contracts/batchCreateReleaseContracts', contract.v1.batchCreateReleaseContracts)
    router.get('test-is-can-exec-event', '/v1/contracts/isCanExecEvent', contract.v1.isCanExecEvent)
    router.post('development-test-api', '/v1/contracts/test', contract.v1.testContractFsm)
    router.post('contract-event-payment', '/v1/contracts/events/payment', contractEvent.v1.payment)
    router.post('contract-event-escrowRefunded', '/v1/contracts/events/escrowRefunded', contractEvent.v1.escrowRefunded)
    router.post('contract-event-signingLicenses', '/v1/contracts/events/signingLicenses', contractEvent.v1.signingLicenses)
    router.post('contract-event-escrowConfiscated', '/v1/contracts/events/escrowConfiscated', contractEvent.v1.escrowConfiscated)
    router.post('contract-event-customEventInvoking', '/v1/contracts/events/customEventInvoking', contractEvent.v1.customEventInvoking)

    //授权相关
    router.get('release-policy-identity-authorization', '/v1/auths/releases/batchPolicyIdentityAuthentication', auth.v1.batchReleasePolicyIdentityAuthentication)
    router.get('presentable-policy-identity-authorization', '/v1/auths/presentables/batchPolicyIdentityAuthentication', auth.v1.batchPresentablePolicyIdentityAuthentication)
    router.get('presentable-node-and-release-side-auth', '/v1/auths/presentables/:presentableId/nodeAndReleaseSideAuth', auth.v1.presentableNodeAndReleaseSideAuth)
    router.get('presentable-batch-node-and-release-side-auth', '/v1/auths/presentables/batchNodeAndReleaseSideAuth', auth.v1.batchPresentableNodeAndReleaseSideAuth)
    router.get('release-auth', '/v1/auths/releases/:releaseId.:extName', auth.v1.releaseAuth)
    router.get('release-auth', '/v1/auths/releases/:releaseId', auth.v1.releaseAuth)
    router.get('presentable-auth', '/v1/auths/presentables/:presentableId.:extName', auth.v1.presentableAuth)
    router.get('presentable-auth-ext', '/v1/auths/presentables/:presentableId', auth.v1.presentableAuth)

    router.resources('contract-info', '/v1/contracts', contract.v1)
};
