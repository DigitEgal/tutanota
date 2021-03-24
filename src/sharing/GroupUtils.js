// @flow

import type {User} from "../api/entities/sys/User"
import type {Group} from "../api/entities/sys/Group"
import type {GroupTypeEnum, ShareCapabilityEnum} from "../api/common/TutanotaConstants"
import {GroupType, groupTypeToString, ShareCapability} from "../api/common/TutanotaConstants"
import type {GroupMembership} from "../api/entities/sys/GroupMembership"
import {isSameId} from "../api/common/utils/EntityUtils"
import type {TranslationKey} from "../misc/LanguageViewModel"
import {lang} from "../misc/LanguageViewModel"
import type {GroupInfo} from "../api/entities/sys/GroupInfo"
import {GroupInfoTypeRef} from "../api/entities/sys/GroupInfo"
import {logins} from "../api/main/LoginController"
import {downcast} from "../api/common/utils/Utils"
import type {GroupMember} from "../api/entities/sys/GroupMember"
import {GroupMemberTypeRef} from "../api/entities/sys/GroupMember"
import type {EntityClient} from "../api/common/EntityClient"
import {promiseMap} from "../api/common/utils/PromiseUtils"
import type {ReceivedGroupInvitation} from "../api/entities/sys/ReceivedGroupInvitation"
import {load, loadAll} from "../api/main/Entity"
import {UserGroupRootTypeRef} from "../api/entities/sys/UserGroupRoot"
import {ReceivedGroupInvitationTypeRef} from "../api/entities/sys/ReceivedGroupInvitation"
import {NotFoundError} from "../api/common/error/RestError"
import type {IUserController} from "../api/main/UserController"

export function hasCapabilityOnGroup(user: User, group: Group, requiredCapability: ShareCapabilityEnum): boolean {
	// TODO I guess we need to check this outside of whereever this was called?
	// if (group.type !== GroupType.Calendar) {
	// 	return false
	// }

	if (isSharedGroupOwner(group, user._id)) {
		return true;
	}
	const membership = user.memberships.find((gm: GroupMembership) => isSameId(gm.group, group._id))
	if (membership) {
		return membership.capability != null && Number(requiredCapability) <= Number(membership.capability)
	}
	return false
}

export function isSharedGroupOwner(sharedGroup: Group, userId: Id): boolean {
	return !!(sharedGroup.user && isSameId(sharedGroup.user, userId))
}

export function getCapabilityText(capability: ?ShareCapabilityEnum): string {
	switch (capability) {
		case ShareCapability.Invite:
			return lang.get("groupCapabilityInvite_label")
		case ShareCapability.Write:
			return lang.get("groupCapabilityWrite_label")
		case ShareCapability.Read:
			return lang.get("groupCapabilityWrite_label")
		default:
			return lang.get("comboBoxSelectionNone_msg")
	}
}

export function getGroupName(groupInfo: GroupInfo, allowGroupNameOverride: boolean): string {
	const {userSettingsGroupRoot} = logins.getUserController()
	const groupSettings = userSettingsGroupRoot.groupSettings.find((gc) => gc.group === groupInfo.group)
	return (allowGroupNameOverride && groupSettings && groupSettings.name)
		|| groupInfo.name
		|| getDefaultGroupName(downcast(groupInfo.groupType))
}

export type GroupMemberInfo = {
	member: GroupMember,
	info: GroupInfo
}

export function getMemberCabability(memberInfo: GroupMemberInfo, group: Group): ?ShareCapabilityEnum {
	if (isSharedGroupOwner(group, memberInfo.member.user)) {
		return ShareCapability.Invite
	}
	return downcast(memberInfo.member.capability)
}

export function loadGroupMembers(group: Group, entityClient: EntityClient): Promise<Array<GroupMemberInfo>> {
	return entityClient.loadAll(GroupMemberTypeRef, group.members)
	                   .then((members) => promiseMap(members, (member) => loadGroupInfoForMember(member, entityClient)))
}

export function loadGroupInfoForMember(groupMember: GroupMember, entityClient: EntityClient): Promise<GroupMemberInfo> {
	return entityClient.load(GroupInfoTypeRef, groupMember.userGroupInfo)
	                   .then((userGroupInfo) => {
		                   return {
			                   member: groupMember,
			                   info: userGroupInfo
		                   }
	                   })
}

export function getDefaultGroupName(groupType: GroupTypeEnum): string {
	switch (groupType) {
		case GroupType.Calendar:
			return lang.get("privateCalendar_label")
		case GroupType.Template:
			return "Templates"
		default:
			return groupTypeToString(groupType)
	}
}

export function getGroupLabelTranslationKey(groupType: GroupTypeEnum): TranslationKey {
	switch (groupType) {
		case GroupType.Calendar:
			return "calendarName_label"
		case GroupType.Template:
			return "templateGroupName_label"
		default:
			return "emptyString_msg"
	}
}


export function loadReceivedGroupInvitations(userController: IUserController, entityClient: EntityClient, type: GroupTypeEnum): Promise<Array<ReceivedGroupInvitation>> {
	return entityClient.load(UserGroupRootTypeRef, userController.userGroupInfo.group)
	                   .then(userGroupRoot => entityClient.loadAll(ReceivedGroupInvitationTypeRef, userGroupRoot.invitations))
	                   .then(invitations => invitations.filter(invitation => getInvitationGroupType(invitation) === type))
	                   .catch(NotFoundError, () => [])
}

// Group invitations without a type set were sent when Calendars were the only shareable kind of user group
const DEFAULT_GROUP_TYPE = GroupType.Calendar

export function getInvitationGroupType(invitation: ReceivedGroupInvitation): GroupTypeEnum {
	return invitation.groupType === null
		? DEFAULT_GROUP_TYPE
		: downcast(invitation.groupType)
}