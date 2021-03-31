// @flow

import {KnowledgeBaseModel} from "../model/KnowledgeBaseModel"
import {Editor} from "../../gui/editor/Editor"
import type {KnowledgebaseViewAttrs, Page} from "./KnowledgeBaseView"
import {KnowledgeBaseView} from "./KnowledgeBaseView"
import {showTemplatePopupInEditor} from "../../templates/view/TemplatePopup"
import type {ButtonAttrs} from "../../gui/base/ButtonN"
import {ButtonType} from "../../gui/base/ButtonN"
import type {DialogHeaderBarAttrs} from "../../gui/base/DialogHeaderBar"
import {lastThrow} from "../../api/common/utils/ArrayUtils"
import {lang} from "../../misc/LanguageViewModel"
import {locator} from "../../api/main/MainLocator"
import {TemplateGroupRootTypeRef} from "../../api/entities/tutanota/TemplateGroupRoot"
import {neverNull, noOp} from "../../api/common/utils/Utils"
import {attachDropdown} from "../../gui/base/DropdownN"
import stream from "mithril/stream/stream.js"
import type {DialogInjectionRightAttrs} from "../../gui/base/DialogInjectionRight"
import {Icons} from "../../gui/base/icons/Icons"
import {TemplatePopupModel} from "../../templates/model/TemplatePopupModel"


export function createKnowledgeBaseDialogInjection(knowledgeBase: KnowledgeBaseModel, templateModel: TemplatePopupModel, editor: Editor): DialogInjectionRightAttrs<KnowledgebaseViewAttrs> {
	const knowledgebaseAttrs = {
		onTemplateSelect: (template) => {
			showTemplatePopupInEditor(templateModel, editor, template, "")
		},
		model: knowledgeBase,
		pages: stream([{type: "list"}])
	}
	return {
		visible: stream(false),
		headerAttrs: _createHeaderAttrs(knowledgebaseAttrs),
		componentAttrs: knowledgebaseAttrs,
		component: KnowledgeBaseView,
	}
}

export function createOpenKnowledgeBaseButtonAttrs(dialogInjectionAttrs: DialogInjectionRightAttrs<KnowledgebaseViewAttrs>, getEmailContent: () => string): ButtonAttrs {

	return {
		label: "openKnowledgebase_action",
		click: () => {
			if (dialogInjectionAttrs.visible() === true) {
				dialogInjectionAttrs.visible(false)
			} else {
				dialogInjectionAttrs.componentAttrs.model.sortEntriesByMatchingKeywords(getEmailContent())
				dialogInjectionAttrs.visible(true)
				dialogInjectionAttrs.componentAttrs.model.init()
			}
		},
		icon: () => Icons.Book,
		isSelected: dialogInjectionAttrs.visible
	}
}


function _createHeaderAttrs(attrs: KnowledgebaseViewAttrs): DialogHeaderBarAttrs {
	return {
		left: () => getLeftHeaderButtonAttrs(lastThrow(attrs.pages()), attrs),
		right: () => getRightHeaderButtonAttrs(lastThrow(attrs.pages()), attrs.model),
		middle: () => getTitle(lastThrow(attrs.pages()))
	}
}

function getLeftHeaderButtonAttrs(currentPage: Page, attrs: KnowledgebaseViewAttrs): Array<ButtonAttrs> {
	switch (currentPage.type) {
		case "list":
			return []
		case "entry":
			return [
				{
					label: "back_action",
					click: () => removeLastPage(attrs),
					type: ButtonType.Secondary
				}
			]
		default:
			throw new Error("stub")
	}
}

function removeLastPage(attrs: KnowledgebaseViewAttrs) {
	attrs.pages((attrs.pages().slice(0, -1)))
}

function getRightHeaderButtonAttrs(currentPage: Page, model: KnowledgeBaseModel): Array<ButtonAttrs> {
	switch (currentPage.type) {
		case "list":
			return [createAddButtonAttrs(model)]
		case "entry":
			const entry = currentPage.entry
			return [
				{
					label: "edit_action",
					click: () => {
						locator.entityClient.load(TemplateGroupRootTypeRef, neverNull(entry._ownerGroup)).then(groupRoot => {
							import("../../settings/KnowledgeBaseEditor").then(editor => {
								editor.showKnowledgeBaseEditor(entry, groupRoot)
							})
						})
					},
					type: ButtonType.Primary,
				}
			]
		default:
			throw new Error("stub")
	}
}

function createAddButtonAttrs(model: KnowledgeBaseModel): ButtonAttrs {
	const templateGroupInstances = model.getTemplateGroupInstances()
	if (templateGroupInstances.length === 1) {
		return {
			label: "add_action",
			click: () => {
				import("../../settings/KnowledgeBaseEditor").then(editor => {
					editor.showKnowledgeBaseEditor(null, templateGroupInstances[0].groupRoot)
				})
			},
			type: ButtonType.Primary,
		}
	} else {
		return attachDropdown({
			label: "add_action",
			click: noOp,
			type: ButtonType.Primary,
		}, () => templateGroupInstances.map(groupInstances => {
			return {
				label: () => groupInstances.groupInfo.name,
				click: () => {
					import("../../settings/KnowledgeBaseEditor").then(editor => {
						editor.showKnowledgeBaseEditor(null, groupInstances.groupRoot)
					})
				},
				type: ButtonType.Dropdown,
			}
		}))
	}
}


function getTitle(currentPage: Page): string {
	switch (currentPage.type) {
		case "list":
			return lang.get("knowledgebase_label")
		case "entry":
			return currentPage.entry.title
		default:
			throw new Error("stub")

	}
}