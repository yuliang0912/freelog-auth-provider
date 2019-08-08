'use strict'

const outsideSystemEvent = require('../../enum/outside-system-event')

const ReleaseSchemeCreateEventHandler = require('./scheme-created-event-handler')
const ReleaseSchemeBindContractEventHandler = require('./scheme-bind-contract-event-handler')
const ReleaseSchemeAuthChangedEventHandler = require('./scheme-auth-changed-event-handler')
const ReleaseSchemeAuthResultResetEventHandler = require('./scheme-auth-result-reset-event-handler')
const ReleaseContractAuthChangedEventHandler = require('./release-contract-auth-changed-event-handler')

module.exports = [
    {
        eventName: outsideSystemEvent.ReleaseSchemeCreateEvent,
        handler: ReleaseSchemeCreateEventHandler
    },
    {
        eventName: outsideSystemEvent.ReleaseSchemeBindContractEvent,
        handler: ReleaseSchemeBindContractEventHandler
    },
    {
        eventName: outsideSystemEvent.ReleaseSchemeAuthChangedEvent,
        handler: ReleaseSchemeAuthChangedEventHandler
    },
    {
        eventName: outsideSystemEvent.ReleaseContractAuthChangedEvent,
        handler: ReleaseContractAuthChangedEventHandler
    },
    {
        eventName: outsideSystemEvent.ReleaseSchemeAuthResetEvent,
        handler: ReleaseSchemeAuthResultResetEventHandler
    }
]