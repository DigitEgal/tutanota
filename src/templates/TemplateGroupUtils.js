// @flow


import type {TemplateGroupRoot} from "../api/entities/tutanota/TemplateGroupRoot"
import {TemplateGroupRootTypeRef} from "../api/entities/tutanota/TemplateGroupRoot"
import {logins} from "../api/main/LoginController"
import {showBusinessFeatureRequiredDialog} from "../misc/SubscriptionDialogs"
import {worker} from "../api/main/WorkerClient"
import {locator} from "../api/main/MainLocator"
import {getEtId} from "../api/common/utils/EntityUtils"

/**
 * @return True if the group has been created.
 */
export function createInitialTemplateListIfAllowed(): Promise<?TemplateGroupRoot> {
	return import("../sharing/GroupUtils").then(({isUsingBusinessFeatureAllowed}) => {
		return logins.getUserController().loadCustomer().then(customer => {
			return isUsingBusinessFeatureAllowed(customer) || showBusinessFeatureRequiredDialog("businessFeatureRequiredTemplates_msg")
		}).then(allowed => {
			if (allowed) {
				return worker.createTemplateGroup("")
			}
		}).then(groupId => {
			if (groupId) {
				return locator.entityClient.load(TemplateGroupRootTypeRef, groupId)
			}
		})
	})
}

export function getTemplateSettingsPathName(groupRoot: TemplateGroupRoot): string {
	return "template-list-settings-" + getEtId(groupRoot)
}