//@flow
import type {Recipients} from "../mail/editor/SendMailModel"
import {getDefaultSender, getEnabledMailAddresses} from "../mail/model/MailUtils"
import {lang} from "../misc/LanguageViewModel"
import type {GroupInfo} from "../api/entities/sys/GroupInfo"
import type {ReceivedGroupInvitation} from "../api/entities/sys/ReceivedGroupInvitation"
import {locator} from "../api/main/MainLocator"
import type {RecipientInfo} from "../api/common/RecipientInfo"
import {logins} from "../api/main/LoginController"
import {MailMethod} from "../api/common/TutanotaConstants"
import {showProgressDialog} from "../gui/ProgressDialog"

export function sendShareNotificationEmail(sharedGroupInfo: GroupInfo, recipients: Array<RecipientInfo>, subject: string, body: (sender: string) => string) {
	locator.mailModel.getUserMailboxDetails().then((mailboxDetails) => {
		const senderMailAddress = getDefaultSender(logins, mailboxDetails)
		// Sending notifications as bcc so that invited people don't see each other
		const bcc = recipients.map(({name, mailAddress}) => ({name, address: mailAddress}))
		_sendNotificationEmail({bcc}, subject, body(senderMailAddress), senderMailAddress)
	})
}


export function sendAcceptNotificationEmail(invitation: ReceivedGroupInvitation) {
	const replacements = {
		"{invitee}": invitation.inviteeMailAddress,
		"{calendarName}": invitation.sharedGroupName,
		"{recipientName}": invitation.inviterMailAddress
	}
	const to = [{name: invitation.inviterName, address: invitation.inviterMailAddress}]
	const senderMailAddress = invitation.inviteeMailAddress
	_sendNotificationEmail({to}, lang.get("shareCalendarAcceptEmailSubject_msg"), lang.get("shareCalendarAcceptEmailBody_msg", replacements), senderMailAddress)
}

export function sendRejectNotificationEmail(invitation: ReceivedGroupInvitation) {
	const replacements = {
		"{invitee}": invitation.inviteeMailAddress,
		"{calendarName}": invitation.sharedGroupName,
		"{recipientName}": invitation.inviterMailAddress
	}
	const to = [{name: invitation.inviterName, address: invitation.inviterMailAddress}]
	const senderMailAddress = invitation.inviteeMailAddress
	_sendNotificationEmail({to}, lang.get("shareCalendarDeclineEmailSubject_msg"), lang.get("shareCalendarDeclineEmailBody_msg", replacements), senderMailAddress)
}


function _sendNotificationEmail(recipients: Recipients, subject: string, body: string, senderMailAddress: string) {
	locator.mailModel.getUserMailboxDetails().then((mailboxDetails) => {
		const sender = getEnabledMailAddresses(mailboxDetails).includes(senderMailAddress)
			? senderMailAddress
			: getDefaultSender(logins, mailboxDetails)
		const confirm = _ => Promise.resolve(true)
		const wait = showProgressDialog
		import("../mail/editor/SendMailModel").then(({defaultSendMailModel}) => {
			return defaultSendMailModel(mailboxDetails)
				.initWithTemplate(recipients, subject, body, [], true, sender)
				.then(model => model.send(MailMethod.NONE, confirm, wait, "tooManyMailsAuto_msg"))
		})

	})

}

